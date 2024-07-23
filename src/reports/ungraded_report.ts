/*
[Assignment v] + ALL
[Group (TA) v] + ALL

Might as well provide a drop down for all the assignments too
Download all the groups, look for the ones that are user names.
Download all the TAs and staff, and look for the ones that are group names.
(Also make it so they can select these from the dropdown)
Then, when they click the button, it will show all the assignments that are ungraded by the selected TAs.
https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.for_students

Be nice to also show them how many they've graded, and how many are left to grade.

*/

import { startDialog } from "~src/canvas/dialog";
import { SpeedGraderInfo } from "~src/canvas/interfaces";
import { getAll, getAllWithoutCourse, getAssignmentPageInfo, getBaseApiUrl, getSpeedGraderUrl } from "~src/canvas/settings";

export const LIST_UNGRADED_BUTTON = `
<li id="assignment-list-ungraded-link">
    <div id="list_ungraded_link_mount_point">
        <a class="icon-check-plus" href="" id="listUngraded" title="List Ungraded Assignments">Ungraded Submissions</a>
    </div>
</li>
`;


export const LIST_UNGRADED_DIALOG_HTML = `
<div id="ungradedReportStatus">Loading, please wait!</div>

<div style="display: flex; flex-flow: row nowrap; margin-bottom: 4px">
    <div class="col-md-12">
        <h3>Controls</h3>
        <div class="form-group">
            <label for="assignment">Assignment</label>
            <select id="list-ungraded-assignment-select" class="form-control">
                <option value="">All Assignments</option>
            </select>
        </div>
        <div class="form-group">
            <label for="group">Group</label>
            <select id="list-ungraded-group-select" class="form-control">
                <option value="">All Groups</option>
            </select>
            <input type="checkbox" id="list-ungraded-remember-as-mine" checked
                class="ms-4">
            <label for="list-ungraded-remember-as-mine">Remember as mine</label>
        </div>
        <div class="form-group">
            <button id="list-ungraded-submit" class="btn btn-primary" disabled>List Ungraded Submissions</button>
        </div>
    </div>
</div>

<div style="width: 100%; height: 400px; overflow: auto">
    <table id="ungradedReportTable" class="table table-striped table-bordered table-condensed table-hover">
        <thead>
            <tr>
                <th>Assignment</th>
                <th>Student</th>
                <th>Speed Grader</th>
                <th>Submission</th>
            </tr>
        </thead>
        <tbody id="ungradedReportTableBody">
        </tbody>
    </table>
</div>
`;

export const LS_UNGRADED_DEFAULT_GROUP = 'setting-ungraded-default-group';

export function getDefaultGroup(pageInfo: SpeedGraderInfo, groups: any[]): string {
    // Select the user's group from LocalStorage, if it exists,
    // Alternatively use the most similarly named group, 
    // or fall back on the All Groups option
    const storedGroup = localStorage.getItem(LS_UNGRADED_DEFAULT_GROUP);
    if (storedGroup !== null) {
        return storedGroup;
    }
    const group = groups.find((group: any) => group.name === pageInfo.currentUser.display_name);
    if (group) {
        return ""+group.id;
    }
    return "";
}

export function changeGroup(event: JQuery.ChangeEvent) {
    const group = $(event.target).val();
    if ($("#list-ungraded-remember-as-mine").is(":checked")) {
        localStorage.setItem(LS_UNGRADED_DEFAULT_GROUP, group as string);
    }
}
export function changeRememberAsMine(event: JQuery.ChangeEvent) {
    const group = $("#list-ungraded-group-select").val();
    if ($(event.target).is(":checked")) {
        localStorage.setItem(LS_UNGRADED_DEFAULT_GROUP, group as string);
    } else {
        localStorage.removeItem(LS_UNGRADED_DEFAULT_GROUP);
    }
}

export async function loadUngradedSubmissions(groupId: string="", assignmentId: string="") {
    if (!groupId) {
        groupId = ""+($("#list-ungraded-group-select").val() || "");
    }
    if (!assignmentId) {
        assignmentId = ""+($("#list-ungraded-assignment-select").val() || "");
    }
    // Get the students from the group
    $("#ungradedReportStatus").html("Loading students...");
    let users;
    if (!groupId) {
        users = [];
    } else {
        const allUsers = await getAllWithoutCourse($.get, getBaseApiUrl() + `groups/${groupId}/users`, {});
        users = allUsers.map((user: any) => user.id);
    }
    // Count the number of assignments
    const countStudents = users.length ? users.length : "all";
    const countAssignments = assignmentId ? "one assignment" : "all assignments";
    // Get the submissions for the users on this assignment
    $("#ungradedReportStatus").html(`Loading ungraded submissions for ${countStudents} student(s) for ${countAssignments}...`);
    const options: Record<string, any> = {
        "student_ids[]": users.length ? users : "all",
        "workflow_state": "submitted",
        "include[]": ["assignment", "user"],
    };
    if (assignmentId) {
        options["assignment_ids[]"] = assignmentId;
    }
    const submissions = await getAll($.get, "students/submissions", options);
    // Display the submissions
    $("#ungradedReportStatus").html(`Displaying ${submissions.length} ungraded submissions...`);
    const table = $("#ungradedReportTableBody");
    table.html("");
    for (const submission of submissions) {
        const row = $("<tr>");
        row.append($("<td>").text(submission.assignment.name));
        row.append($("<td>").text(submission.user.name));
        const speedGraderUrl = getSpeedGraderUrl(submission.user.id, submission.assignment.id);
        row.append($("<td>").append($("<a>").attr("href", speedGraderUrl).text("Speed Grader")));
        const submissionUrl = submission.assignment.html_url + "/submissions/" + submission.user.id;
        row.append($("<td>").append($("<a>").attr("href", submissionUrl).text("Submission")));
        table.append(row);
    }
}

export async function loadUngraded() {
    const pageInfo = getAssignmentPageInfo();
    // Get the groups
    const groups = await getAll($.get, "groups", {});
    $("#list-ungraded-group-select").append(groups.map((group: any) => `<option value="${group.id}">${group.name}</option>`).join(""));
    // Get the assignments
    const assignments = await getAll($.get, "assignments", {});
    $("#list-ungraded-assignment-select").append(assignments.map((assignment: any) => `<option value="${assignment.id}">${assignment.name}</option>`).join(""));
    // Select the default assignment from pageInfo
    $("#list-ungraded-assignment-select").val(pageInfo.assignmentId);
    const defaultGroup = getDefaultGroup(pageInfo, groups);
    $("#list-ungraded-group-select").val(defaultGroup);
    $("#list-ungraded-group-select").on("change", changeGroup);
    $("#list-ungraded-remember-as-mine").on("change", changeRememberAsMine);
    // clicking the button will list the ungraded submissions
    $("#list-ungraded-submit").on("click", () => loadUngradedSubmissions());
    $("#list-ungraded-submit").prop("disabled", false);
    // Clear the loading message
    $("#ungradedReportStatus").html("");
}

export function injectListUngradedButton(target: HTMLElement) {
    $(target).append(LIST_UNGRADED_BUTTON);
    $("#listUngraded").on("click", (event: JQuery.ClickEvent) => {
        event.preventDefault();
        startDialog("List Ungraded Submissions", LIST_UNGRADED_DIALOG_HTML);
        loadUngraded();
        return false;
        // loadSubmission();
    });
}