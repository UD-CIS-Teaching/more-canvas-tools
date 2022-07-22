import { startDialog, loadDialog } from "../canvas/dialog";
import {
    getAll, makeLastWeek, ParseSizes, getAllBatched, CanvasRequestOptions
} from "../canvas/settings";
import {User, Assignment, SubmissionGroup, Submission, WorkflowState} from "../canvas/interfaces";

const ACTIVITY_REPORT_BUTTON = `
<li class='section'>
    <button title='Activity Report' class='btn' id='cwu-activity-report-load'>User Activity Report</button>
</li>
`;

const ACTIVITY_REPORT_DIALOG = `
<div>
Status: <span id="cwu-activity-report-status">Loading</span>
</div>
<div id="cwu-activity-report-controls"></div>
<div id="cwu-activity-report-area"></div>
`;

const PLEASE_WAIT_HTML = `
<emphasis>Please wait, I'm loading.</emphasis>
`;

const ERROR_MESSAGE_HTML = `
`;

const ACTIVITY_REPORT_CONTROLS = `
<div>
    <label for="cwu-activity-report-control-start">Completed since:</label>
    <input type="text" class="" id="cwu-activity-report-control-start"
        name="cwu-activity-report-control-start" title="YYYY-MM-DD hh:mm">
</div>
<div>
    <button class='btn btn-success' id='cwu-activity-report-control-build'
        disabled
        >Download and Build Report</button>
</div>
`;

const ACTIVITY_REPORT_AREA = `
<strong>Student Submissions</strong><br>
<emphasis>
    <span id='cwu-activity-report-area-student-loaded'></span>
    /
    <span id='cwu-activity-report-area-student-count'></span> loaded
</emphasis>
<div id='cwu-activity-report-area-student'>
    <table class="table table-striped table-bordered table-condensed"
        id="cwu-activity-report-area-student-table">
    <tr>
        <th>Student</th>
        <th>Submitted Recently</th>
        <th>Total Unsubmitted</th>
    </tr>
    </table>
</div>
<strong>Staff Grading</strong>
<table class="table table-striped table-bordered table-condensed"
id="cwu-activity-report-area-grader-table">
</table>
`;

function updateGraderReport(graders: any, staff: User[]) {
    let staffLookup: any = {};
    staff.forEach((s: User) => { staffLookup[s.id + ""] = s });
    let body = `
    <tr>
        <th>Grader</th>
        <th>Graded Recently</th>
        <th>Graded Total</th>
    </tr>
    `+ Object.keys(graders).map((gId: any) => {
        return `<tr>
            <td>${staffLookup[gId].name}</td>
            <td>${graders[gId].recent}</td>
            <td>${graders[gId].total}</td>
        </tr>`;
    }).join("\n");
    $("#cwu-activity-report-area-grader-table").html(body);
}

type UserMap = { [key: number]: number };

function makeStudentReport(students: User[], staff: User[], assignments: Assignment[], subs: Submission[]) {
    setStatus("Downloaded submissions");
    const DEFAULT_DATE = makeLastWeek();
    let thresholdDate = $("#cwu-activity-report-control-start").val() || DEFAULT_DATE;
    // Determine total submittable assignments
    // Determine recently submitted assignments
    // Determine total submitted assignments
    let totalAssignments: number = assignments.filter((a: Assignment) => a.published).length;
    let recentSubmissions: UserMap = {};
    let totalSubmissions: UserMap = {};
    students.forEach((student: User) => {
        recentSubmissions[student.id] = 0;
        totalSubmissions[student.id] = totalAssignments;
    });
    subs.forEach((sub: Submission) => {
        recentSubmissions[sub.user.id] += (sub.submitted_at > thresholdDate) ? 1 : 0;
        totalSubmissions[sub.user.id] -= 1;
    });
    let rows = students.map((student: User) => {
        return `<tr>
            <td>${student.name}</td>
            <td>${recentSubmissions[student.id]}</td>
            <td>${totalSubmissions[student.id]}</td>
        </tr>`;
    }).join("\n");
    let body = `<table class="table table-striped table-bordered table-condensed">
    <tr>
        <th>Student</th>
        <th>Submitted Recently</th>
        <th>Total Unsubmitted</th>
    </tr>
    ${rows}
    </table>`;
    $("#cwu-activity-report-area-student").html(body);
}

function getCellValue(tr: any, idx: any) {
    return tr.children[idx].innerText || tr.children[idx].textContent;
}

const comparer = (idx: any, asc: any) => (a: any, b: any) => ((v1, v2) =>
    v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
)(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

// do the work...
function makeTableSortable(table: any) {
    table.forEach((th: any) => th.addEventListener('click', (function () {
        const table = th.closest('table');
        let ascending = true;
        Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), ascending = !ascending))
            .forEach(tr => table.appendChild(tr));
    })));
}

function prepareDownloadBuildButton(students: User[], staff: User[], assignments: Assignment[]) {
    setStatus("Preloaded students, staff, and assignments");
    $("#cwu-activity-report-control-build").prop("disabled", false);
    $("#cwu-activity-report-control-build").click(() => {
        $("#cwu-activity-report-area").html(ACTIVITY_REPORT_AREA);
        makeTableSortable(document.querySelectorAll("#cwu-activity-report-area-student-table th"));
        setStatus("");
        let startDate = $("#cwu-activity-report-control-start").val() || makeLastWeek();
        let studentsLoaded = 0;
        let totalAssignments: number = assignments.filter((a: Assignment) => a.published).length;
        let graders: any = {};
        staff.forEach((grader: User) => { graders[grader.id] = { total: 0, recent: 0 }; });
        $("#cwu-activity-report-area-student-count").html(students.length + "");
        getAllBatched($.get, "students/submissions",
            students.map((student: User) => { return { student: student, options: { "student_ids[]": student.id } } }),
            (options: CanvasRequestOptions, subs: Submission[]) => {
                let unsubmitted = subs.filter((sub: Submission) => sub.workflow_state === WorkflowState.unsubmitted);
                let left = unsubmitted.length;
                let recent = subs.filter((sub: Submission) => (sub.submitted_at > startDate) ? 1 : 0);
                // Graders stuff
                subs.forEach((sub: Submission) => {
                    if (sub.workflow_state === WorkflowState.graded && sub.grader_id in graders) {
                        graders[sub.grader_id].total += 1;
                        if (sub.submitted_at > startDate) {
                            graders[sub.grader_id].recent += 1;
                        }
                    }
                });
                updateGraderReport(graders, staff);
                // Update student tables
                $("#cwu-activity-report-area-student table").append(
                    $(`<tr><td>${options.student.name}</td><td>${recent.length}</td><td>${left}</td></tr>`)
                );
                studentsLoaded += 1;
                $("#cwu-activity-report-area-student-loaded").html(studentsLoaded + "");
            });
    });
    /*addMeter(getAll($.get, "students/submissions", {
        "student_ids[]": "all",
        "include[]": ["assignment", "user"],
        //"grouped": true,
        //"submitted_since": startDate // TODO: No, we need all of them
    }), "Submissions").done((subs: Submission[]) => {
        makeStudentReport(students, staff, assignments, subs);
    })*/
}

function setStatus(message: string) {
    $("#cwu-activity-report-status").html(message);
}

function addMeter(d: any, meter: string): any {
    let meterObj = $(`<span id="cwu-activity-report-status-${meter}">${meter}</span>`);
    $("#cwu-activity-report-status").append(meterObj);
    function updateStatus(meter: string) {
        return (soFar: any, sizes: ParseSizes) => {
            if (sizes === undefined || sizes.last === sizes.current) {
                $("#cwu-activity-report-status-" + meter).remove();
            } else if (sizes.last === undefined) {
                $("#cwu-activity-report-status-" + meter).html(meter + `<span class='badge'>${soFar.length} so far</span>`);
            } else {
                $("#cwu-activity-report-status-" + meter).html(meter + `<span class='badge'>${sizes.last - sizes.current}</span>`);
            }
        };
    }
    return d.progress(updateStatus(meter)).done(updateStatus(meter));
}

export function loadUserActivityReport() {
    $("#section-tabs").append($(ACTIVITY_REPORT_BUTTON));
    $("#cwu-activity-report-load").click(() => {
        startDialog("User Activity Report", ACTIVITY_REPORT_DIALOG);
        $("#cwu-activity-report-controls").html(ACTIVITY_REPORT_CONTROLS);
        $("#cwu-activity-report-control-start").val(makeLastWeek());
        $.when(
            addMeter(getAll($.get, "users", { 'enrollment_type[]': 'student' }), "Students"),
            addMeter(getAll($.get, "users", { 'enrollment_type[]': ['ta', 'teacher'] }), "Staff"),
            addMeter(getAll($.get, "assignments", {}), "Assignments")
        ).done(prepareDownloadBuildButton);
    });



    /**
     * Allow user to specify threshold date
     * Get the students
     * Get the TAs/staff
     * Get the submissions
     * Construct two tables:
     * 1) Student's submissions
     *      Total assignments submitted, still remaining
     *      Total points achieved, still remaining
     * 2) TA's graded
     *      Total assignments graded
     *      Still remaining overall
     */
}