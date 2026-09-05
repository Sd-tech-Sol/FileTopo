<#
.SYNOPSIS
    Reserve X5, held OUTSIDE the application: the canonical evidence of a
    VERIFIED task, and the guard that refuses to delete it.

.DESCRIPTION
    The application refuses to WRITE a verified task's evidence, at the gate in
    `write_run_artifact`. The run scripts do not write artefacts — they DELETE
    stale ones before a pass, which is the same destruction by another route,
    and a gate the application holds says nothing about a script that reaches
    around it.

    This file exists because the list was previously copied into every script.
    Two spellings of one list eventually disagree, and the disagreement is
    discovered the day a proof goes missing. There is now ONE list, dot-sourced:

        . (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')
        Assert-NotProtectedRunArtifact -Path $stale

    The list grows the moment a task becomes VERIFIED, never before:

      * TASK-0016, TASK-0017 — verified by ACTION-0026 and ACTION-0027
      * TASK-0018 — verified by ACTION-0029, four proofs
      * TASK-0019 — verified by ACTION-0031, SIX proofs, four of which are
        themselves regression replays. Being a replay does not make evidence
        less canonical once the task that published it has been controlled.
      * TASK-0020 — verified by ACTION-0032, FIVE proofs: the M12 campaign's
        two WebView2 passes, the J12 intra-brain regression, and the two passes
        of the L12 composed regression.
      * TASK-0022 — verified by ACTION-0036, EIGHT proofs: J12, K11, the two
        L12 passes, the two M12 passes and the two N15 passes. H9, K12 and
        every -abandon variant remain noncanonical and are not protected.
      * TASK-0023 — verified by ACTION-0039, TWO proofs: the EC15 pass1 and
        pass2 of the exact content observations, run in the real WebView2
        host. The narrowest extension so far, deliberately: TASK-0023 migrated
        seven scenarios and wrote artefacts for several of them, but it was
        controlled on EC15 alone, so its H9, J12, K11, K12, L12, M12 and N15
        replays and every -abandon variant stay unprotected.
      * TASK-0024 — verified by ACTION-0041, THREE proofs: DR15 pass1, DR15
        pass2 and the J12 intra-brain regression. The corrective X11 proof and
        every other TASK-0024 output remain noncanonical and unprotected.

    Thirty-two names. Nothing here deletes, renames or moves anything: this file
    only refuses.
#>

$script:ProtectedRunArtifacts = @(
    'TASK-0016-H1-H7-verification.json',
    'TASK-0016-H9-webview2.json',
    'TASK-0017-J11-isolation.json',
    'TASK-0017-J12-webview2.json',
    'TASK-0018-K11-readonly-and-isolation.json',
    'TASK-0018-K12-webview2-pass1.json',
    'TASK-0018-K12-webview2-pass2.json',
    'TASK-0018-J12-relations-regression-webview2.json',
    'TASK-0019-J12-relations-regression-webview2.json',
    'TASK-0019-K11-readonly-regression-webview2.json',
    'TASK-0019-K12-foundation-regression-webview2-pass1.json',
    'TASK-0019-K12-foundation-regression-webview2-pass2.json',
    'TASK-0019-L12-composed-view-webview2-pass1.json',
    'TASK-0019-L12-composed-view-webview2-pass2.json',
    'TASK-0020-M12-interbrain-relations-webview2-pass1.json',
    'TASK-0020-M12-interbrain-relations-webview2-pass2.json',
    'TASK-0020-J12-intrabrain-regression-webview2.json',
    'TASK-0020-L12-composed-regression-webview2-pass1.json',
    'TASK-0020-L12-composed-regression-webview2-pass2.json',
    'TASK-0022-J12-intrabrain-relations-regression-webview2.json',
    'TASK-0022-K11-readonly-isolation-regression-webview2.json',
    'TASK-0022-L12-composed-view-regression-webview2-pass1.json',
    'TASK-0022-L12-composed-view-regression-webview2-pass2.json',
    'TASK-0022-M12-interbrain-relations-regression-webview2-pass1.json',
    'TASK-0022-M12-interbrain-relations-regression-webview2-pass2.json',
    'TASK-0022-N15-topographic-node-graph-webview2-pass1.json',
    'TASK-0022-N15-topographic-node-graph-webview2-pass2.json',
    'TASK-0023-EC15-exact-content-observations-webview2-pass1.json',
    'TASK-0023-EC15-exact-content-observations-webview2-pass2.json',
    'TASK-0024-DR15-deterministic-relation-engine-webview2-pass1.json',
    'TASK-0024-DR15-deterministic-relation-engine-webview2-pass2.json',
    'TASK-0024-J12-intrabrain-relations-regression-webview2.json'
)

function Get-ProtectedRunArtifact {
    <# The thirty-two names, for a caller that wants to report them. #>
    return $script:ProtectedRunArtifacts
}

function Assert-NotProtectedRunArtifact {
    <#
    .SYNOPSIS
        Throws if the path names canonical evidence of a VERIFIED task.

    .DESCRIPTION
        Called before every deletion. A run script deletes only its OWN previous
        output for the pass it is about to run, so a stale file cannot be
        mistaken for a fresh result — and this refuses the moment a rename or a
        copied constant points that deletion at somebody else's proof.
    #>
    param([Parameter(Mandatory = $true)][string]$Path)

    $name = Split-Path -Leaf $Path
    if ($script:ProtectedRunArtifacts -contains $name) {
        throw "X5: $name est la preuve canonique d'une tache VERIFIED — ce script ne la touche pas"
    }
}
