import { startDialog } from "~src/canvas/dialog";
import { getBaseCourseUrl, getBaseCourseUrlNoApi, getCourseId } from "~src/canvas/settings";

interface PageUser {
    name: string;
    canvasId: string;
    sisId: string;
    section: string;
    type: string;
}

function getStudentsFromPage(): PageUser[] {
    let pageUsers = document.getElementsByClassName('rosterUser');
    let users: PageUser[] = [];
    for (let i = 0; i < pageUsers.length; i++) {
        const userRow = pageUsers[i];
        if (userRow instanceof HTMLElement) {
            let columns = userRow.children;
            const userId = /user_(\d+)/g.exec(userRow.id);
            users.push({
                name: (columns[1] as HTMLElement).innerText,
                canvasId: userId == null ? "": userId[1],
                sisId: (columns[3] as HTMLElement).innerText,
                section: (columns[4] as HTMLElement).innerText,
                type: (columns[5] as HTMLElement).innerText
            });
        }
    }
    return users.filter(item => item.type == 'Student');
}

function limitStudents(students: PageUser[], courseId: number): Promise<PageUser[]> {
    return new Promise(function (resolve, reject) {
        const promises: JQuery.jqXHR[] = [];
        const errors: PageUser[] = [];
        students.forEach((student: PageUser) => {
            const rawToken = document.cookie.split("; ").find(elt => elt.startsWith("_csrf_token"));
            if (rawToken) {
                const token = unescape(rawToken).split("=")[1];
                promises.push(
                    jQuery.ajax(getBaseCourseUrlNoApi() + "/limit_user_grading/" + student.canvasId,
                    {
                        data: {
                            limit: "1",
                            _method: "POST",
                            authenticity_token: token
                        },
                        type: "POST"
                    })
                );
            } else {
                errors.push(student);
            }
        });
        Promise.allSettled(promises)
            .then(results=>{
                results.forEach((result,i)=>{
                    if (result.status==='rejected'){
                        errors.push(students[i]);
                    }
                });
                resolve(errors);
            });
    });
}

async function updateStudents(retries: number){
    let students = getStudentsFromPage();
    let courseId = getCourseId();
    for (let i= 0;i < retries && students.length > 0; i++){
        students = await limitStudents(students, courseId);
        if (students.length>0){
            $("#limitEnrollmentFinalStatus").append(`Retrying ${students.length} records<br>`);
        }else{
            $("#limitEnrollmentFinalStatus").append(`All records processed<br>`);
        }
    }
    return students;
}

const LIMIT_ENROLLMENT_BUTTON_HTML = `
<a href="#" class="btn pull-right icon-plus" id="limitEnrollment" role="button"
    style="margin-left: 1em; margin-right: 1em"
    title="Limit enrollment for students by their section"
    aria-label="Limit enrollment for students by their section" data-tooltip="">
    Limit Enrollment
</a>
`;

const ENROLLMENT_DIALOG_HTML = `
<div id="limitEnrollmentFinalStatus"></div>
<div style="width: 100%; height: 400px; overflow: auto">
    <ul id="limitEnrollmentResults">
    </ul>
</div>
`;

export function injectLimitEnrollmentButton() {
    $("#addUsers").after($(LIMIT_ENROLLMENT_BUTTON_HTML));
    $("#limitEnrollment").on("click", async () => {
        startDialog("Limit Enrollment Tool", ENROLLMENT_DIALOG_HTML);
        const results = await updateStudents(3);
        if (results.length > 0) {
            $("#limitEnrollmentFinalStatus").append("Completed with errors for the following students:<br>");
            results.forEach(student=>{
                $("#limitEnrollmentResults").append(
                    $(`<li>${student.name} (${student.canvasId})</li>`)
                );
            });
        } else {
            $("#limitEnrollmentFinalStatus").append("Completed without errors");
        }
    });
    console.log($("#addUsers"));
}
