import { getAll, getBaseCourseUrlNoApi } from "~src/canvas/settings";

export const RECENTLY_ENROLLED_HTML = `
<div role="complementary" aria-label="Recently Enrolled Users"
    style="margin-top: 24px">
    <h2>Recently Added Users</h2>
    <div id="recency-controls" class="form-inline"
        title="Only show users who have been added in the past N days. If blank, then shows all the users."
    >
        <label for="recency-days">Show added in last</label>
        <input type="number" id="recency-days" 
            class="form-control form-control-sm"
            style="width: 4em"
            value="7" min="1">
        <label for="recency-days">days</label>
    </div>
    <div id="recent-enrollment-list">
        Loading...
    </div>
</div>
`;

const ROLE_PRIORITY: Record<string, number> = {
    "ObserverEnrollment": 4,
    "StudentEnrollment": 0,
    "DesignerEnrollment": 3,
    "TaEnrollment": 2,
    "TeacherEnrollment": 1,
    "AdminEnrollment": 5,
    "Other": 6
};
const ROLE_NAMES: Record<string, string> = {
    "ObserverEnrollment": "Observers",
    "StudentEnrollment": "Students",
    "DesignerEnrollment": "Designers",
    "TaEnrollment": "Teaching Assistants",
    "TeacherEnrollment": "Teachers",
    "AdminEnrollment": "Admins",
    "Other": "Other"
};

export const TOO_MANY_USERS_THRESHOLD = 5;

export async function injectRecentlyEnrolled(sidebar: HTMLElement | null) {
    if (!sidebar) {
        return;
    }
    $(sidebar).append(RECENTLY_ENROLLED_HTML);
    reloadRecentlyEnrolled(sidebar);
    $("#recency-days").on("change", () => reloadRecentlyEnrolled(sidebar));
}

function getRecency(user: any) {
    const enrollment = user.enrollments[0];
    const createdAt = new Date(enrollment.created_at);
    const now = new Date();
    const diff = now.getTime() - createdAt.getTime();
    return diff / (24 * 60 * 60 * 1000);
}

async function reloadRecentlyEnrolled(sidebar: HTMLElement) {
    // Get all the users who have been added to the course, and their enrollment type
    let allUsers = await getAll($.get, "users", { "per_page": 100, "include[]": ["enrollments"] });
    // Filter for only users who are recent
    const rawRecencyDays = $("#recency-days").val() as string;
    if (rawRecencyDays.toString().trim() !== "") {
        const recencyDays = parseInt(rawRecencyDays);
        const now = new Date();
        const cutoff = new Date(now.getTime() - recencyDays * 24 * 60 * 60 * 1000);
        allUsers = allUsers.filter((user: any) => {
            const enrollment = user.enrollments[0];
            const createdAt = new Date(enrollment.created_at);
            return createdAt > cutoff;
        });
    }
    // Sort them into group by roles (students, instructors, TAs, designers, etc.)
    const usersByRole = allUsers.reduce((acc: any, user: any) => {
        const role = user.enrollments[0].type;
        if (!acc[role]) {
            acc[role] = [];
        }
        acc[role].push(user);
        return acc;
    }, {});
    // Create a list for each group
    $("#recent-enrollment-list").empty();
    for (const role of Object.keys(usersByRole).sort((a, b) => ROLE_PRIORITY[a] - ROLE_PRIORITY[b])) {
        let roleList = usersByRole[role];
        roleList.sort((a: any, b: any) => getRecency(a) - getRecency(b));
        const roleDiv = $(`
            <div class="recent-enrollment-group" data-role="${role}">
                <span>${ROLE_NAMES[role]}</span>
                <ul id="recent-enrollment-group-${role}"></ul>
            </div>
        `);
        $("#recent-enrollment-list").append(roleDiv);
        let restOfRoleList = roleList.slice(TOO_MANY_USERS_THRESHOLD);
        roleList = roleList.slice(0, TOO_MANY_USERS_THRESHOLD);
        for (const user of roleList) {
            const row = addUser(user, role);
            $(`#recent-enrollment-group-${role}`).append(row);
        }
        if (restOfRoleList.length > 0) {
            // Make a "and X more" row that is expandable using details
            const row = $(`<li><small><details><summary>And ${restOfRoleList.length} more...</summary></details></small></li>`);
            $(`#recent-enrollment-group-${role}`).append(row);
            const details = row.find("details");
            for (const user of restOfRoleList) {
                const row = addUser(user, role);
                details.append(row);
            }
        }
    }
}

function getUserRecencyColor(recency: number) {
    if (recency < 3) {
        return "ic-badge--danger";
    } else if (recency < 5) {
        return "ic-badge--alert";
    } else {
        return "ic-badge--neutral";
    }
}

function addUser(user: any, role: string) {
    const recency = getRecency(user);
    const row = `<li title="${user.name} enrolled ${recency.toFixed(1)} days ago">
    <a href="${getBaseCourseUrlNoApi()}/users/${user.id}" target="_blank">
        <small>${user.name}
            <span class="ic-badge ${getUserRecencyColor(recency)}" style="border: 1px solid darkgray; display: inline-block; white-space: nowrap">${recency.toFixed(0)}</span>
        </small>
        </a>
    </li>`;
    return row;
}