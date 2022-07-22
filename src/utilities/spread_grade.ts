import { startDialog } from "~src/canvas/dialog";
import { Submission, SubmissionAttachment, User } from "~src/canvas/interfaces";
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
<div id="spreadGradeStatus"></div>
<table class='table table-striped table-condensed' id="spreadGradePartners">
    <thead>
        <th>Email</th>
        <th>Name</th>
        <th>Existing Grade</th>
        <th>Spread?</th>
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
    console.log(allStudents);
    const emailMap: Record<string, User> = Object.fromEntries(allStudents.map((u: User) => [u.email, u]));
    const userIdMap: Record<string, User> = Object.fromEntries(allStudents.map((u: User) => [u.id+"", u]));
    emails.forEach(async (email: string) => {
        const student = emailMap[email];
        if (!student) {
            $("#spreadGradePartners").append(`<tr><td>${email}</td><td colspan="3">Unknown email address</td></tr>`);
            return;
        }
        const oldSubmission = await $.get(`${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${student.id}`)
        $("#spreadGradePartners").append(
            `<tr id="spread-grade-${student.id}">
                <td>${email}</td>
                <td>${student.name}</td>
                <td class='spread-grade-result'>${oldSubmission.grade || ""}</td>
                <td><button>${oldSubmission.grade ? "Overwrite": "Spread"}</button></td>
            </tr>`
        )
        $(`#spread-grade-${student.id} button`).on("click", () => {
            submitForStudent(student.id, assignmentId, submission, userIdMap[submission.grader_id+""] || getSpeedGraderInfo().currentUser);
        });
    });
}

async function submitForStudent(studentId: number, assignmentId: number, submission: Submission, grader: User) {
    const data: Record<string, any> = {
        'comment[text_comment]': `Grade transferred by ${grader.display_name} from partner's submission.`,
        'submission[posted_grade]': ""+submission.score,
        'submission[excuse]': submission.excused,
        'submission[seconds_late_override]': submission.seconds_late,
    };
    if (submission.late_policy_status) {
        data['submission[late_policy_status]'] = submission.late_policy_status;
    }
    let failed = false;
    let graded = undefined;
    try {
        graded = await $.ajax({
            type: 'put',
            url: `${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${studentId}`,
            //contentType: 'application/json',
            data
        });
        failed = 'errors' in graded;
    } catch (e) {
        failed = true;
        console.error(e);
    }
    if (!failed && graded) {
        $(`#spread-grade-${studentId} .spread-grade-result`).html(""+graded.score);
        $(`#spread-grade-${studentId} button`).after("Success!");
        $(`#spread-grade-${studentId} button`).remove();
    } else {
        $(`#spread-grade-${studentId} button`).html("❌Failed");
    }
    // TODO: Check for errors in the `graded` result
    /*const resub = await $.post(`${getBaseCourseUrl()}/assignments/${assignmentId}/submissions/${student.id}`, {
        'submission[submission_type]': 'online_upload',
        'submission[user_id]': teammateId,
        'submission[submitted_at]': sub.submitted_at,
        'comment[text_comment]': "Uploaded automatically by Ada Bot."
    });*/

}

async function loadSubmission() {
    const studentId = $("#students_selectmenu").val();
    const speedGraderInfo = getSpeedGraderInfo();
    const submission: Submission = await $.get(`${getBaseCourseUrl()}/assignments/${speedGraderInfo.assignmentId}/submissions/${studentId}`, {
        "include[]": "user,visibility,submission_comments,rubric_assessment,full_rubric_assessment"
    })
    if (submission && submission.grade && submission.attachments && submission.attachments.length) {
        const partners = await Promise.all(submission.attachments.map(processAttachment));
        if (partners && partners.length) {
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