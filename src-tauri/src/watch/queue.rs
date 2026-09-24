//! The bounded queue between the OS reader and the reconciler — `DEC-0041` §2.
//!
//! It holds **hints**: a relative name and one closed bit (see [`Hint`]), deduplicated,
//! and nothing else — no action, no time, no identity. A hint says *where to look*,
//! never *what happened*.
//!
//! **Bounded, and never silent.** The queue keeps at most `capacity` distinct
//! hints. The hint that would not fit does not vanish: it turns the queue into a
//! **loss** ([`LossReason::QueueFull`]), the pending hints are released (a loss
//! already owes a full verification, which supersedes every one of them) and the
//! reader is never blocked. A loss is sticky until the reconciler takes it.

use super::types::LossReason;
use std::collections::{HashMap, VecDeque};
use std::sync::{Condvar, Mutex, MutexGuard};
use std::time::{Duration, Instant};

/// **Where to look**, and nothing about what happened.
///
/// `membership` is one closed bit: `true` when the entry may have appeared, disappeared
/// or been renamed — so the directory that *lists* it may differ — and `false` when only
/// the entry's own attributes or date moved. It cannot say *created*, *moved* or
/// *deleted*, and so cannot become a journal nature: the journal comes from a
/// re-enumeration and a canonical comparison, never from this.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct Hint {
    /// Relative, `/`-separated, confined to the root.
    pub path: String,
    pub membership: bool,
}

impl Hint {
    #[cfg(test)]
    pub(crate) fn member(path: &str) -> Self {
        Self {
            path: path.to_string(),
            membership: true,
        }
    }

    #[cfg(test)]
    pub(crate) fn modified(path: &str) -> Self {
        Self {
            path: path.to_string(),
            membership: false,
        }
    }
}

/// What the reconciler took from the queue in one go.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub(crate) struct Drained {
    /// Distinct hints, in arrival order. Empty when `lost` is set.
    pub hints: Vec<Hint>,
    /// Set when at least one loss happened since the previous take.
    pub lost: Option<LossReason>,
}

impl Drained {
    #[cfg(test)]
    pub(crate) fn is_empty(&self) -> bool {
        self.hints.is_empty() && self.lost.is_none()
    }
}

#[derive(Default)]
struct State {
    /// Distinct paths, in arrival order; `members` holds each one's membership bit.
    order: VecDeque<String>,
    members: HashMap<String, bool>,
    lost: Option<LossReason>,
    closed: bool,
    /// A wake-up that carries no signal (a manual gesture, a stop).
    poked: bool,
    max_len: usize,
    coalesced: u64,
    received: u64,
    losses: u64,
}

pub(crate) struct SignalQueue {
    capacity: usize,
    state: Mutex<State>,
    wake: Condvar,
}

/// Counters read by a proof.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct QueueStats {
    pub max_len: usize,
    pub coalesced: u64,
    pub received: u64,
    pub losses: u64,
}

impl SignalQueue {
    pub(crate) fn new(capacity: usize) -> Self {
        Self {
            capacity: capacity.max(1),
            state: Mutex::new(State::default()),
            wake: Condvar::new(),
        }
    }

    fn lock(&self) -> MutexGuard<'_, State> {
        // A poisoned lock only means another thread panicked while holding it; the
        // state is plain data and stays coherent, and the watcher must go on.
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// Adds a hint. A hint already pending for the same path is merged (counted, not stored
    /// twice) and keeps the stronger bit: a path that may have changed membership stays so.
    /// Once a loss is pending the hint is irrelevant — the next cycle is a full
    /// verification — and is counted as coalesced into it.
    pub(crate) fn push_hint(&self, hint: Hint) {
        let mut state = self.lock();
        if state.closed {
            return;
        }
        state.received += 1;
        if state.lost.is_some() {
            state.coalesced += 1;
            return;
        }
        if let Some(known) = state.members.get_mut(&hint.path) {
            *known |= hint.membership;
            state.coalesced += 1;
            return;
        }
        if state.order.len() >= self.capacity {
            Self::raise_loss(&mut state, LossReason::QueueFull);
            self.wake.notify_all();
            return;
        }
        state.members.insert(hint.path.clone(), hint.membership);
        state.order.push_back(hint.path);
        state.max_len = state.max_len.max(state.order.len());
        self.wake.notify_all();
    }

    /// Records a loss. The first reason of a pending loss is kept; a full queue
    /// release its hints because the full verification it owes covers them.
    pub(crate) fn mark_lost(&self, reason: LossReason) {
        let mut state = self.lock();
        if state.closed {
            return;
        }
        Self::raise_loss(&mut state, reason);
        self.wake.notify_all();
    }

    fn raise_loss(state: &mut State, reason: LossReason) {
        state.losses += 1;
        if state.lost.is_none() {
            state.lost = Some(reason);
        }
        state.order.clear();
        state.members.clear();
    }

    /// Whether anything is owed: a hint or a loss.
    pub(crate) fn has_pending(&self) -> bool {
        let state = self.lock();
        !state.order.is_empty() || state.lost.is_some()
    }

    /// Takes everything and resets the queue, loss included.
    pub(crate) fn take(&self) -> Drained {
        let mut state = self.lock();
        let lost = state.lost.take();
        let order: Vec<String> = state.order.drain(..).collect();
        let hints = order
            .into_iter()
            .map(|path| {
                let membership = state.members.get(&path).copied().unwrap_or(true);
                Hint { path, membership }
            })
            .collect();
        state.members.clear();
        Drained { hints, lost }
    }

    /// A wake-up without a signal: a manual gesture finished, or the watcher is
    /// being stopped. It only interrupts a wait.
    pub(crate) fn poke(&self) {
        let mut state = self.lock();
        state.poked = true;
        self.wake.notify_all();
    }

    /// Ends the queue: further pushes are ignored and every wait returns at once.
    pub(crate) fn close(&self) {
        let mut state = self.lock();
        state.closed = true;
        self.wake.notify_all();
    }

    /// Waits until something is pending, the queue is poked or closed, or `timeout`
    /// elapses. Returns whether something is pending. A poke is consumed.
    pub(crate) fn wait(&self, timeout: Duration) -> bool {
        let deadline = Instant::now() + timeout;
        let mut state = self.lock();
        loop {
            if !state.order.is_empty() || state.lost.is_some() {
                return true;
            }
            if state.poked {
                state.poked = false;
                return false;
            }
            if state.closed {
                return false;
            }
            let now = Instant::now();
            if now >= deadline {
                return false;
            }
            state = self
                .wake
                .wait_timeout(state, deadline - now)
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .0;
        }
    }

    /// Sleeps up to `timeout`, returning early **only** for a poke or a close — never
    /// for a pending signal. It is what a watcher does while it deliberately leaves
    /// signals queued (a source that is absent, a retry that is not due): waiting on
    /// [`SignalQueue::wait`] there would spin, since it returns at once when
    /// something is pending.
    pub(crate) fn nap(&self, timeout: Duration) {
        let deadline = Instant::now() + timeout;
        let mut state = self.lock();
        loop {
            if state.closed {
                return;
            }
            if state.poked {
                state.poked = false;
                return;
            }
            let now = Instant::now();
            if now >= deadline {
                return;
            }
            state = self
                .wake
                .wait_timeout(state, deadline - now)
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .0;
        }
    }

    /// Waits up to `window` **without** returning early for a signal — the
    /// collection window of a burst — but still returning at once when the queue is
    /// closed or when a loss is already pending (nothing more to collect).
    pub(crate) fn collect_for(&self, window: Duration) {
        let deadline = Instant::now() + window;
        let mut state = self.lock();
        loop {
            if state.closed || state.lost.is_some() {
                return;
            }
            let now = Instant::now();
            if now >= deadline {
                return;
            }
            state = self
                .wake
                .wait_timeout(state, deadline - now)
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .0;
        }
    }

    #[cfg(test)]
    pub(crate) fn is_closed(&self) -> bool {
        self.lock().closed
    }

    pub(crate) fn stats(&self) -> QueueStats {
        let state = self.lock();
        QueueStats {
            max_len: state.max_len,
            coalesced: state.coalesced,
            received: state.received,
            losses: state.losses,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn duplicate_hints_are_merged_and_counted_not_stored_twice() {
        let queue = SignalQueue::new(8);
        for _ in 0..5 {
            queue.push_hint(Hint::member("a/b"));
        }
        queue.push_hint(Hint::member("a/c"));
        let drained = queue.take();
        assert_eq!(
            drained.hints,
            vec![Hint::member("a/b"), Hint::member("a/c")]
        );
        assert_eq!(drained.lost, None);
        let stats = queue.stats();
        assert_eq!(stats.received, 6);
        assert_eq!(stats.coalesced, 4);
        assert_eq!(stats.max_len, 2);
    }

    #[test]
    fn a_path_that_may_have_changed_membership_keeps_that_bit_when_merged() {
        let queue = SignalQueue::new(8);
        queue.push_hint(Hint::modified("a/b"));
        queue.push_hint(Hint::member("a/b"));
        queue.push_hint(Hint::modified("a/b"));
        queue.push_hint(Hint::modified("a/c"));
        let drained = queue.take();
        assert_eq!(
            drained.hints,
            vec![Hint::member("a/b"), Hint::modified("a/c")],
            "the stronger bit wins; the plain modification stays plain"
        );
    }

    #[test]
    fn a_full_queue_raises_an_explicit_loss_and_never_drops_silently() {
        let queue = SignalQueue::new(3);
        for index in 0..3 {
            queue.push_hint(Hint::member(&format!("d/{index}")));
        }
        assert!(!queue.take().is_empty());
        for index in 0..3 {
            queue.push_hint(Hint::member(&format!("d/{index}")));
        }
        // The fourth distinct hint does not fit: it becomes a loss.
        queue.push_hint(Hint::member("d/overflow"));
        assert!(queue.has_pending());
        let drained = queue.take();
        assert_eq!(drained.lost, Some(LossReason::QueueFull));
        assert!(
            drained.hints.is_empty(),
            "a loss supersedes the hints: the full verification it owes covers them"
        );
        assert_eq!(queue.stats().losses, 1);
        assert!(
            queue.stats().max_len <= 3,
            "the queue never exceeds its bound"
        );
    }

    #[test]
    fn a_loss_is_sticky_until_taken_and_keeps_its_first_reason() {
        let queue = SignalQueue::new(4);
        queue.mark_lost(LossReason::OsOverflow);
        queue.mark_lost(LossReason::ParserInvalid);
        queue.push_hint(Hint::member("later"));
        let drained = queue.take();
        assert_eq!(drained.lost, Some(LossReason::OsOverflow));
        assert!(drained.hints.is_empty());
        assert!(!queue.has_pending(), "taking resets the loss");
        assert_eq!(queue.take(), Drained::default());
    }

    #[test]
    fn a_closed_queue_ignores_pushes_and_wakes_waiters() {
        let queue = SignalQueue::new(4);
        queue.close();
        queue.push_hint(Hint::member("x"));
        queue.mark_lost(LossReason::Injected);
        assert!(!queue.has_pending());
        assert!(
            !queue.wait(Duration::from_secs(5)),
            "a closed queue returns at once"
        );
        assert!(queue.is_closed());
    }

    #[test]
    fn wait_returns_early_for_a_signal_and_after_the_timeout_otherwise() {
        let queue = std::sync::Arc::new(SignalQueue::new(4));
        let started = Instant::now();
        assert!(!queue.wait(Duration::from_millis(60)));
        assert!(started.elapsed() >= Duration::from_millis(50));

        let pusher = queue.clone();
        let handle = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(30));
            pusher.push_hint(Hint::member("w"));
        });
        assert!(queue.wait(Duration::from_secs(5)));
        handle.join().expect("pusher");
    }

    #[test]
    fn a_poke_interrupts_a_wait_without_pretending_a_signal_exists() {
        let queue = std::sync::Arc::new(SignalQueue::new(4));
        let poker = queue.clone();
        let handle = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(30));
            poker.poke();
        });
        let started = Instant::now();
        assert!(!queue.wait(Duration::from_secs(10)));
        assert!(started.elapsed() < Duration::from_secs(5));
        assert!(!queue.has_pending());
        handle.join().expect("poker");
    }

    #[test]
    fn collecting_lets_a_burst_accumulate_within_the_window() {
        let queue = std::sync::Arc::new(SignalQueue::new(16));
        let pusher = queue.clone();
        let handle = std::thread::spawn(move || {
            for index in 0..4 {
                pusher.push_hint(Hint::member(&format!("burst/{index}")));
                std::thread::sleep(Duration::from_millis(10));
            }
        });
        queue.push_hint(Hint::member("burst/first"));
        queue.collect_for(Duration::from_millis(150));
        handle.join().expect("pusher");
        let drained = queue.take();
        assert_eq!(drained.hints.len(), 5, "the whole burst is in one take");
    }
}
