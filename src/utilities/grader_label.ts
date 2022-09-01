import { startDialog } from "~src/canvas/dialog";
import { Submission, SubmissionAttachment, User } from "~src/canvas/interfaces";
import { getAll, getBaseCourseUrl, getSpeedGraderInfo } from "~src/canvas/settings";

const WHO_IS_BUTTON = `
<div>
    <a href="#" id="who-is-button" icon="icon-peer-graded" class="btn"
        role="button"
        style="margin-bottom: 1em; margin-right: 1em"
        title="Check who graded this submission"
        aria-label="Check who graded this submission" data-tooltip="">
        Check Grader
    </a>
</div>
`;

async function labelGrader() {
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('student_id');
    const speedGraderInfo = getSpeedGraderInfo();
    const submission: Submission = await $.get(`${getBaseCourseUrl()}/assignments/${speedGraderInfo.assignmentId}/submissions/${studentId}`, {
        "include[]": "user,visibility,submission_comments,rubric_assessment,full_rubric_assessment"
    })
    let body = `No grader information. Either this wasn't graded, or the grade was assigned by Canvas (e.g., for a late assignment).`;
    if (submission.grader_id === null) {
    } else if (submission.grader_id < 0) {
        body = `Autograded (${submission.grader_id})`;
    } else {
        const grader = await $.get(`${getBaseCourseUrl()}/users/${submission.grader_id}`)
        body = `${grader.name} (${submission.graded_at})`;
    }
    startDialog("Grader Information", body);
}

export function injectGraderLabel(target: HTMLElement) {
    $(target).before(WHO_IS_BUTTON);
    $("#who-is-button").on("click", () => {
        labelGrader();
    });
}