//! Deterministic left-to-right layered tree layout (`DEC-0024`).
//!
//! The input order is the scanner/index order and is preserved exactly. The
//! layout is paid once per bounded projection (DEC-0031); rendering,
//! selection, pan, zoom and territory composition consume that view geometry.

use serde::{Deserialize, Serialize};

pub const LAYOUT_ALGORITHM: &str = "layered-tree-cards-v1";
pub const CARD_WIDTH: f64 = 240.0;
pub const CARD_HEIGHT: f64 = 64.0;
pub const COLUMN_GAP: f64 = 120.0;
pub const ROW_GAP: f64 = 28.0;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[cfg(test)]
impl Rect {
    fn intersection_area(&self, other: &Rect) -> f64 {
        let width = (self.x + self.w).min(other.x + other.w) - self.x.max(other.x);
        let height = (self.y + self.h).min(other.y + other.h) - self.y.max(other.y);
        if width <= 0.0 || height <= 0.0 {
            0.0
        } else {
            width * height
        }
    }
}

/// Minimal view of the tree the layout needs: parent links, in index order.
pub struct LayoutInput<'a> {
    /// `parents[i]` is the position of node `i`'s parent, or `None` for the root.
    pub parents: &'a [Option<usize>],
}

#[derive(Debug, Clone, PartialEq)]
pub struct LayoutOutput {
    pub rects: Vec<Rect>,
    pub width: f64,
    pub height: f64,
    /// One invocation per projection, never for pan, zoom or ordinary selection.
    pub invocations: u32,
}

/// Computes `layered-tree-cards-v1` in a bounded number of O(n) passes.
///
/// The scanner returns parents before children. Invalid parent positions are
/// ignored defensively so arithmetic never becomes NaN/Inf; normal map builds
/// independently enforce one valid root and exact parent links.
pub fn compute(input: LayoutInput<'_>) -> LayoutOutput {
    let count = input.parents.len();
    if count == 0 {
        return LayoutOutput {
            rects: Vec::new(),
            width: 0.0,
            height: 0.0,
            invocations: 1,
        };
    }

    let mut children = vec![Vec::<usize>::new(); count];
    let mut roots = Vec::new();
    for (index, parent) in input.parents.iter().copied().enumerate() {
        match parent {
            Some(parent_index) if parent_index < count && parent_index != index => {
                children[parent_index].push(index);
            }
            _ => roots.push(index),
        }
    }
    let root = roots.first().copied().unwrap_or(0);

    // Pass 1, bottom-up. Parents precede children in scanner order.
    let mut subtree_span = vec![CARD_HEIGHT; count];
    for index in (0..count).rev() {
        if children[index].is_empty() {
            continue;
        }
        let children_span = children[index]
            .iter()
            .map(|child| subtree_span[*child])
            .sum::<f64>();
        let gaps = ROW_GAP * children[index].len().saturating_sub(1) as f64;
        subtree_span[index] = CARD_HEIGHT.max(children_span + gaps);
    }

    // Pass 2a, top-down: assign each subtree interval and depth.
    let mut interval_top = vec![0.0; count];
    let mut depth = vec![0usize; count];
    let mut stack = vec![root];
    while let Some(index) = stack.pop() {
        let mut cursor = interval_top[index];
        for child in &children[index] {
            interval_top[*child] = cursor;
            depth[*child] = depth[index].saturating_add(1);
            cursor += subtree_span[*child] + ROW_GAP;
        }
        for child in children[index].iter().rev() {
            stack.push(*child);
        }
    }

    // Pass 2b, bottom-up: direct-child centres determine parent centres.
    let mut centre_y = vec![0.0; count];
    for index in (0..count).rev() {
        centre_y[index] = match (children[index].first(), children[index].last()) {
            (Some(first), Some(last)) => (centre_y[*first] + centre_y[*last]) / 2.0,
            _ => interval_top[index] + subtree_span[index] / 2.0,
        };
    }

    let rects = (0..count)
        .map(|index| Rect {
            x: depth[index] as f64 * (CARD_WIDTH + COLUMN_GAP),
            y: canonical_zero(centre_y[index] - CARD_HEIGHT / 2.0),
            w: CARD_WIDTH,
            h: CARD_HEIGHT,
        })
        .collect::<Vec<_>>();
    let max_depth = depth.iter().copied().max().unwrap_or(0);
    let width = (max_depth + 1) as f64 * CARD_WIDTH + max_depth as f64 * COLUMN_GAP;
    let height = subtree_span[root].max(CARD_HEIGHT);

    LayoutOutput {
        rects,
        width: canonical_zero(width),
        height: canonical_zero(height),
        invocations: 1,
    }
}

fn canonical_zero(value: f64) -> f64 {
    if value == 0.0 { 0.0 } else { value }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_finite(output: &LayoutOutput) {
        assert!(output.width.is_finite() && output.height.is_finite());
        assert!(output.width >= 0.0 && output.height >= 0.0);
        for rect in &output.rects {
            assert!(rect.x.is_finite() && rect.y.is_finite());
            assert!(rect.w.is_finite() && rect.h.is_finite());
            assert_eq!(rect.w, CARD_WIDTH);
            assert_eq!(rect.h, CARD_HEIGHT);
        }
    }

    fn assert_no_card_overlap(output: &LayoutOutput) {
        for (position, left) in output.rects.iter().enumerate() {
            for right in &output.rects[position + 1..] {
                assert_eq!(
                    left.intersection_area(right),
                    0.0,
                    "{left:?} overlaps {right:?}"
                );
            }
        }
    }

    #[test]
    fn defensive_empty_is_finite_and_invoked_once() {
        let output = compute(LayoutInput { parents: &[] });
        assert_eq!(output.rects, Vec::<Rect>::new());
        assert_eq!(
            (output.width, output.height, output.invocations),
            (0.0, 0.0, 1)
        );
        assert_finite(&output);
    }

    #[test]
    fn lone_root_has_the_exact_card_and_world() {
        let output = compute(LayoutInput { parents: &[None] });
        assert_eq!(
            output.rects[0],
            Rect {
                x: 0.0,
                y: 0.0,
                w: 240.0,
                h: 64.0
            }
        );
        assert_eq!((output.width, output.height), (240.0, 64.0));
    }

    #[test]
    fn simple_chain_uses_depth_columns_and_one_vertical_centre() {
        let output = compute(LayoutInput {
            parents: &[None, Some(0), Some(1), Some(2)],
        });
        assert_eq!(
            output.rects.iter().map(|rect| rect.x).collect::<Vec<_>>(),
            vec![0.0, 360.0, 720.0, 1080.0]
        );
        assert!(output.rects.iter().all(|rect| rect.y == 0.0));
        assert_eq!((output.width, output.height), (1320.0, 64.0));
    }

    #[test]
    fn parent_with_many_siblings_preserves_order_and_gap() {
        let output = compute(LayoutInput {
            parents: &[None, Some(0), Some(0), Some(0), Some(0)],
        });
        let ys = output.rects[1..]
            .iter()
            .map(|rect| rect.y)
            .collect::<Vec<_>>();
        assert_eq!(ys, vec![0.0, 92.0, 184.0, 276.0]);
        assert_eq!(output.rects[0].y, 138.0);
        assert_eq!(output.height, 340.0);
        assert_no_card_overlap(&output);
    }

    #[test]
    fn multiple_branches_have_disjoint_subtree_intervals() {
        let parents = [
            None,
            Some(0),
            Some(0),
            Some(1),
            Some(1),
            Some(2),
            Some(2),
            Some(2),
        ];
        let output = compute(LayoutInput { parents: &parents });
        let a_bottom = output.rects[4].y + CARD_HEIGHT;
        let b_top = output.rects[5].y;
        assert_eq!(b_top - a_bottom, ROW_GAP);
        assert_no_card_overlap(&output);
    }

    #[test]
    fn depth_forty_is_finite_and_not_compressed() {
        let mut parents = vec![None];
        for index in 1..=40 {
            parents.push(Some(index - 1));
        }
        let output = compute(LayoutInput { parents: &parents });
        assert_eq!(output.rects[40].x, 40.0 * 360.0);
        assert_eq!(output.width, 41.0 * 240.0 + 40.0 * 120.0);
        assert_finite(&output);
    }

    #[test]
    fn repeated_layout_is_bit_deterministic() {
        let parents = [None, Some(0), Some(0), Some(1), Some(1), Some(2)];
        assert_eq!(
            compute(LayoutInput { parents: &parents }),
            compute(LayoutInput { parents: &parents })
        );
    }

    #[test]
    fn every_non_root_can_derive_one_hierarchy_edge() {
        let parents = [None, Some(0), Some(0), Some(1), Some(2), Some(2)];
        let output = compute(LayoutInput { parents: &parents });
        assert_eq!(
            parents.iter().filter(|parent| parent.is_some()).count(),
            output.rects.len() - 1
        );
    }
}
