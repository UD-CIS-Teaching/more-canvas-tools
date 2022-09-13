import { startDialog } from "~src/canvas/dialog";
import { FullRubricAssessment, RubricCriterion, RubricRating, Submission, SubmissionAttachment, User, Comment } from "~src/canvas/interfaces";
import { getAll, getBaseCourseUrl, getSpeedGraderInfo } from "~src/canvas/settings";
import { downloadWord } from "~src/canvas/word";

const SPREAD_GRADE_BUTTON = `
<a href="#" class="btn" id="spreadGrade" role="button"
    style="margin-left: 1em; margin-right: 1em"
    title="Spread this grade to any other identified teammates"
    aria-label="Spread this grade to any other identified teammates" data-tooltip="">
    Spread Grade
</a>
`;

const SPREAD_GRADE_DIALOG_HTML = `
<div id="spreadGradeStatus">Loading, please wait!</div>

<div style="display: flex; flex-flow: row nowrap; margin-bottom: 4px">
    <div class="col-md-7">
        <h3>Content to Spread</h3>
        <div>Grade: <span id="sg-existing-grade"></span></div>
        <div>Rubric:</div>
        <table class='table table-striped table-condensed' id="sg-existing-rubric">
            <thead>
                <th>Rubric Item</th>
                <th>Rating</th>
                <th>Points</th>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    <div class="col-md-5">
        <h3>Students Found</h3>
        <p>Use the buttons below to copy the grade and/or rubric scores to the other members of this group.</p>
        <div id="sg-found-partners">
        </div>
    </div>
</div>

<h3>Copy Comments</h3>
<p>
    Use the buttons below to copy comments to other submissions.
    The comments will appear to come from your user account.
    Disabled buttons indicate that the comment already exists in the target students' submission (even if you did not make the comment).
</p>
<table class='table table-striped table-condensed' id="sg-comments">
    <thead>
        <th style="width: 20%">User</th>
        <th>Comment</th>
        <th>Actions</th>
    </thead>
</table>
<div style="width: 100%; height: 400px; overflow: auto">
    <ul id="spreadGradeResults">
    </ul>
</div>
`;

function displayError(message: string) {
    $("#spreadGradeStatus").addClass("alert alert-danger").html(message);
}

function clearStatus() {
    $("#spreadGradeStatus").removeClass("alert alert-danger").html("");
}

const FIND_UD_EMAILS = /[a-zA-Z0-9.+_-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}/gm;

function findEmails(contents: string): string[] {
    return [...contents.matchAll(FIND_UD_EMAILS)].map((value: RegExpMatchArray) => value[0]);
}

async function processAttachment(attachment: SubmissionAttachment): Promise<string[]> {
    let zip, mainFile: string | undefined;
    try {
        zip = await downloadWord(attachment.url);
    } catch (e) {
        displayError(`Could not download a Word file from the attachment: ${attachment.url}`);
        throw e;

    }
    try {
        mainFile = await zip.file('word/document.xml')?.async("string");
    } catch (e) {
        displayError(`Could not process the Word file from the attachment: ${attachment.url}`);
        throw e;
    }
    if (!mainFile) {
        displayError("Students' word document appears to be empty or corrupted.");
        throw "Word document appears to be empty or corrupted";
    }
    return findEmails(mainFile);
}

async function listPartners(emails: string[], assignmentId: number, submission: Submission) {
    const allStudents: User[] = await getAll($.get, `users`, {});
    const emailMap: Record<string, User> = Object.fromEntries(allStudents.map((u: User) => [u.email?.toLowerCase(), u]));
    const userIdMap: Record<string, User> = Object.fromEntries(allStudents.map((u: User) => [u.id+"", u]));
    emails.forEach(async (email: string) => {
        const borderline = ' style="margin-bottom: 2px; padding-bottom: 2px; border-top: 1px solid lightgray;"';
        const student = emailMap[email.toLowerCase()];
        if (!student) {
            $("#sg-found-partners").append(`<div ${borderline}>Unknown Email Address: ${email}</div>`);
            return;
        }
        const oldSubmission: Submission = await getFullSubmission(assignmentId, student.id);
        const actionText = submission.user.id === student.id ? "<strong>Original submitting student</strong><br>" : 
            oldSubmission.grade ? `<button>Overwrite</button>` : `<button>Spread</button>`;
        $("#sg-found-partners").append(
            `<div id="sg-spread-result-${student.id}" ${borderline}>
                <a href="?assignment_id=${assignmentId}&student_id=${student.id}" target=_blank>${student.name}</a> (${email})<br>
                <span class="sg-spread-grade" style="margin-right: 4px">${oldSubmission.grade || ""}</span>
                <span class="sg-spread-rubric" style="margin-right: 4px">${oldSubmission.full_rubric_assessment?.data.length ? "(has rubric)" : ""}</span>
                ${actionText}
            </div>`
        );
        const graderUser = userIdMap[submission.grader_id+""] || getSpeedGraderInfo().currentUser;
        $(`#sg-spread-result-${student.id} button`).on("click", () => {
            submitForStudent(student.id, assignmentId, submission, graderUser);
        });

        // Comment stuff
        if (submission.user.id !== student.id && submission.submission_comments && submission.submission_comments.length) {
            submission.submission_comments.forEach((comment: Comment) => {
                const copyCommentButton = $(`<button>${student.name}</button>`);
                if (commentAlreadyMade(comment, oldSubmission.submission_comments)) {
                    copyCommentButton.prop('disabled', true);
                    copyCommentButton.attr("title", "Comment already made!");
                }
                copyCommentButton.on('click', async (e) => {
                    const successful = await makeComment(comment.comment, student.id, assignmentId, submission, graderUser);
                    if (successful) {
                        copyCommentButton.prop("disabled", true);
                        copyCommentButton.attr("title", "Comment copied successfully!");
                    } else {
                        alert("Failed to copy comment!");
                    }
                });
                $(`#sg-comments-action-${comment.id}`).append(copyCommentButton);
                $(`#sg-comments-action-${comment.id}`).append("<br>");
            });
        }
    });
}

function commentAlreadyMade(comment: Comment, oldComments: Comment[]) {
    if (oldComments && oldComments.length) {
        return oldComments.some((oldComment: Comment) => comment.comment === oldComment.comment);
    }
    return false;
}

function fillInExisting(submission: Submission) {
    $("#sg-existing-grade").html(""+submission.score);
    if (submission.full_rubric_assessment && submission.full_rubric_assessment.data.length) {
        const criteria = Object.fromEntries(submission.assignment.rubric.map((r: RubricCriterion) => [r.id, r]));

        const rubric = submission.full_rubric_assessment.data.map((rating: RubricRating): string => {
            const ratingCriteria = criteria[rating.criterion_id];
            let row = `
                <tr>
                    <td>${ratingCriteria.description}</td>
                    <td>${rating.description}</td>
                    <td>${rating.points}/${ratingCriteria.points}</td>
                </tr>
            `;
            if (rating.comments) {
                row += `<tr><td colspan="3"><small>Comment: ${rating.comments}</small></td></tr>`;
            }
            return row;
        }).join("\n");
        $("#sg-existing-rubric tbody").html(rubric);
    }

    if (submission.submission_comments && submission.submission_comments.length) {
        submission.submission_comments.forEach((comment: Comment) => {
            $("#sg-comments").append(`<tr>
                <td>
                    <img src="${comment.avatar_path}" class="avatar" style="display: inline"/>
                    ${comment.author_name}
                </td>
                <td>
                    ${comment.comment}
                </td>
                <td id="sg-comments-action-${comment.id}">
                    Copy to: 
                </td>
            </tr>`);
        });
    }
}

function attachRubricGrade(data: Record<string, any>, rubric: RubricRating[]) {
    rubric.forEach((rating: RubricRating) => {
        const criterionId = rating.criterion_id;
        data[`rubric_assessment[${criterionId}][points]`] = rating.points;
        data[`rubric_assessment[${criterionId}][rating_id]`] = rating.id;
        if (rating.comments) {
            data[`rubric_assessment[${criterionId}][comments]`] = rating.comments;
        }
    });
    return true;
}

async function makeComment(comment: string, studentId: number, assignmentId: number, submission: Submission, grader: User): Promise<boolean> {
    const data: Record<string, any> = {
        'comment[text_comment]': comment,
    };
    let failed= false, graded = undefined;
    try {
        graded = await $.ajax({
            url: `${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${studentId}`,
            type: 'put',
            data
        });
        failed = 'errors' in graded;
    } catch (e) {
        failed = true;
        console.error(e);
    }
    return !failed;
}

async function submitForStudent(studentId: number, assignmentId: number, submission: Submission, grader: User) {
    let name = grader.display_name ? `transferred by ${grader.display_name} ` : "";
    const data: Record<string, any> = {
        //'comment[text_comment]': `Grade ${name}from partner's submission.`,
        'submission[posted_grade]': ""+submission.score,
        'submission[excuse]': submission.excused,
        'submission[seconds_late_override]': submission.seconds_late,
    };
    let withRubric = false;
    let rubricData: Record<string, any> = {};
    if (submission.full_rubric_assessment && submission.full_rubric_assessment.data.length) {
        withRubric = attachRubricGrade(rubricData, submission.full_rubric_assessment.data);
    }
    if (submission.late_policy_status) {
        data['submission[late_policy_status]'] = submission.late_policy_status;
    }
    let failed = false;
    let graded = undefined, gradedRubric = undefined;
    try {
        gradedRubric = await $.ajax({
            url: `${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${studentId}`,
            type: 'put',
            data: rubricData
        });
        graded = await $.ajax({
            url: `${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${studentId}`,
            type: 'put',
            data
        });
        failed = 'errors' in graded || 'errors' in gradedRubric;
        // Send the rubric scores too
    } catch (e) {
        failed = true;
        console.error(e);
    }
    if (!failed && graded) {
        $(`#sg-spread-result-${studentId} .sg-spread-grade`).html(""+graded.score);
        $(`#sg-spread-result-${studentId} .sg-spread-rubric`).html(withRubric ? "(has rubric)" : "");
        $(`#sg-spread-result-${studentId} button`).after("Success!");
        $(`#sg-spread-result-${studentId} button`).remove();
    } else {
        $(`#sg-spread-result-${studentId} button`).html("❌Failed");
    }
    // TODO: Check for errors in the `graded` result
    /*const resub = await $.post(`${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${student.id}`, {
        'submission[submission_type]': 'online_upload',
        'submission[user_id]': teammateId,
        'submission[submitted_at]': sub.submitted_at,
        'comment[text_comment]': "Uploaded automatically by Ada Bot."
    });*/

}

async function getFullSubmission(assignmentId: number, studentId: number | string | undefined | string[]) {
    return $.get(`${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${studentId}`, {
        "include[]": ["user", "visibility", "submission_comments", "rubric_assessment", "full_rubric_assessment", "assignment"]
    });
}

async function loadSubmission() {
    const studentId = $("#students_selectmenu").val();
    const speedGraderInfo = getSpeedGraderInfo();
    const submission: Submission = await getFullSubmission(speedGraderInfo.assignmentId, studentId);
    if (submission && submission.grade && submission.attachments && submission.attachments.length) {
        const partners = await Promise.all(submission.attachments.map(processAttachment));
        if (partners && partners.length) {
            clearStatus();
            fillInExisting(submission);
            await listPartners(partners.flat(), speedGraderInfo.assignmentId, submission);
        } else {
            displayError("No partners were found in the Word Document. Did they mess up the format?");
        }
    } else {
        if (!submission) {
            displayError("No submission to spread.");
        } else if (!submission.grade) {
            displayError("No grade to spread.");
        } else {
            displayError("Assignment did not have any attachments uploaded.");
        }
    }
}

export function injectSpreadGradeButton(target: HTMLElement) {
    $(target).after(SPREAD_GRADE_BUTTON);
    $("#spreadGrade").on("click", () => {
        startDialog("Spread Grade", SPREAD_GRADE_DIALOG_HTML);
        loadSubmission();
    });
}