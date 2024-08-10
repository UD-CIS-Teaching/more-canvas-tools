import { startDialog } from "~src/canvas/dialog";
import { loadJsCssFile } from "~src/canvas/external";
import { Course } from "~src/canvas/interfaces";
import { getAll, getAllWithoutCourse, getBaseApiUrl } from "~src/canvas/settings";

export interface SearchableAttribute {
    name: string;
    type: "text" | "number" | "date" | "boolean";
}

export interface SearchableResource {
    name: string;
    attributes: (string | SearchableAttribute)[];
}

export const SEARCHABLE_COURSE_ATTRIBUTES: SearchableAttribute[] = [
    { name: "course_code", type: "text" },
    { name: "name", type: "text" },
    { name: "start_at", type: "date" },
    { name: "end_at", type: "date" },
    { name: "term", type: "text" },
    { name: "published", type: "boolean" },
    { name: "completed", type: "boolean" }
];

// TODO: Remember previous searches
const DEFAULT_SEARCHED_ITEMS = ["pages"];
export const SEARCHABLE_RESOURCES: Record<string, SearchableResource> = {
    pages: {
        name: "Pages",
        attributes: [
            { name: "title", type: "text" },
            { name: "body", type: "text" }
        ]
    },
    syllabus: {
        name: "Syllabus",
        attributes: []
    },
    assignment: {
        name: "Assignments",
        attributes: ["name"]
    },
    quiz: {
        name: "Quizzes",
        attributes: ["name", "questions"]
    },
    discussion_topic: {
        name: "Discussion Topics",
        attributes: ["title", "body"]
    },
    file: {
        name: "Files",
        attributes: ["display_name"]
    },
    module: {
        name: "Modules",
        attributes: ["name"]
    },
    users: {
        name: "Users",
        attributes: ["name", "login_id"]
    }
};

export const SEARCH_MENU_ITEM = `
<li class="menu-item ic-app-header__menu-list-item">
    <a id="global_nav_search_link" role="button" href="#"
        class="ic-app-header__menu-list-link" aria-label="Search" title="Search">
        <div class="menu-item-icon-container">
            <i class="icon-search" style="font-size: 1.5em;"></i>
        </div>
        <div class="menu-item__text">Search</div>
    </a>
</li>
`;

const SEARCH_TYPES_HTML = 
    Object.keys(SEARCHABLE_RESOURCES).map((key) => {
        const shouldSearch = DEFAULT_SEARCHED_ITEMS.includes(key);
        const attributes = SEARCHABLE_RESOURCES[key].attributes.map((attrData) => {
            const attr = typeof attrData === "string" ? attrData : attrData.name;
            return `<li>
                <label for="search-dialog-attr-${key}-${attr}">
                    <code>${attr}</code>
                </label>
                <input type="checkbox" id="search-dialog-attr-${key}-${attr}"
                    ${shouldSearch ? "checked" : ""}>
            </li>`;
        }).join("\n");
        return `<div class="search-dialog-type-${key} col-3"
            style="border: 1px solid black; padding: 0.5em; margin: 0.5em">
            <label for="search-dialog-type-${key}">${SEARCHABLE_RESOURCES[key].name}</label>
            <input type="checkbox" id="search-dialog-type-${key}"
                ${shouldSearch ? "checked" : ""}>
            <ul style="margin-left: 1em; display: ${shouldSearch ? "block" : "none"}"
                id="search-dialog-attr-${key}">
                ${attributes}
            </ul>
        </div>`;
    }).join("\n");

export const SEARCH_DIALOG_HTML = `
<div id="search-dialog">
    <div class="alert alert-info">Sorry, this feature is still in development. It may not work as expected.</div>
    <span>Search for type(s) across courses:</span>
    <div id="builder"></div>
    <div class="row">
        <div class="col-5">
            <p>Choose courses that match all of these filters:</p>
            <ul id="search-dialog-course-rules">
                <li>Name contains 106</li>
            </ul>
            <button class="btn btn-primary" id="search-dialog-course-add-rule">Add Filter</button>
        </div>
        <div class="col-5">
            <p>Preview of selected courses:</p>
            <ul id="search-dialog-course-preview" style="max-height: 10em; overflow-y: auto;">
                <li>106 - Course Name</li>
            </ul>
        </div>
    </div>
    <div class="row">
        <div class="col-5">
            <button class="btn btn-primary" id="search-dialog-course-save">Save course filters</button>
        </div>
        <div class="col-5">
            <button class="btn btn-primary" id="search-dialog-course-load">Load course filters</button>
        </div>
    </div>
    <div style="margin-left: 1em" class="row">
        ${SEARCH_TYPES_HTML}
    </div>
    <div style="display:none; margin-left: 1em;" id="search-dialog-choose-courses">
        <div>Choose Specific Courses</div>
        <div class="row">
            <div class="col-5">
                <select id="search-dialog-courses" class="form-control" multiple></select>
                <div class="form-text">Choose which courses to search across.</div>
            </div>
            <div class="col-5">
                <button id="search-dialog-courses-add">Add selected courses</button>
                <ul id="search-dialog-courses-chosen"></ul>
            </div>
        </div>
        <div>
            <button id="search-dialog-courses-save">Save course selections as option</button>
        </div>
        <div>
            Previous course selections:
            <select id="search-dialog-courses-previous" class="form-control"></select>
            <div class="form-text">Choose a previous selection of courses to search across.</div>
            <div id="search-dialog-courses-preview"></div>
            <button id="search-dialog-courses-load">Load this previous course selection</button>
        </div>
        <hr>
    </div>
    <div>
        <label for="search-dialog-input">For text:</label>
        <input type="text" id="search-dialog-input" class="form-control" value="text">
    </div>
    <div>
        <input type="checkbox" id="search-dialog-fuzzy" class="form-control">
        <label class="form-label">Use Fuzzy Match instead of Exact Match</label>
        <div class="form-text">Useful for when you're not sure of the exact text, and want to use a more approximate match.</div>
    </div>
    <div>
        <button id="search-dialog-submit" class="btn btn-primary">Search</button>
    </div>
    <hr>
    <div id="search-dialog-results">
        <div id="search-dialog-status">Loading...</div>
        <div id="search-dialog-results-list"></div>
    </div>
</div>
`;

export interface SearchRequest {
    input: string;
    resources: Record<string, string[]>;
    across: string;
    fuzzy: boolean;
}

export interface SearchResponse {
    course: Course;
    type: string;
    title: string;
    id: number;
    url: string;
    text: string;
    data: any;
}

export function buildRequest(): SearchRequest {
    const input = $("#search-dialog-input").val() as string;
    const resources: Record<string, string[]> = {};
    Object.keys(SEARCHABLE_RESOURCES).forEach((key) => {
        const type = $(`#search-dialog-type-${key}`);
        if (type.prop("checked")) {
            resources[key] = SEARCHABLE_RESOURCES[key].attributes.filter((attr) => {
                return $(`#search-dialog-attr-${key}-${attr}`).prop("checked");
            }).map((attr) => {
                return attr as string;
            });
        }
    });
    const across = $("#search-dialog-across").val() as string;
    const fuzzy = $("#search-dialog-fuzzy").prop("checked");
    return { input, resources, across, fuzzy };
}

export async function searchResource(input: string, course: Course, type: string, attributes: string[]): Promise<SearchResponse[]> {  
    const responses: SearchResponse[] = [];
    const options: Record<string, any> = { "per_page": 100, "include[]": attributes};
    const url = `${getBaseApiUrl()}courses/${course.id}/${type}`;
    const data = await getAllWithoutCourse($.get, url, options);
    for (const item of data) {
        // Check each attribute to see if there is a match
        const matches = attributes.filter((attr) => {
            return item[attr] && item[attr].includes(input);
        })
        if (matches.length) {
            const title = item["title"] || item["name"] || item["display_name"] || item["login_id"];
            const text = matches.map((attr) => {
                return item[attr];
            }).join("\n");
            const url = item["html_url"] || item["url"];
            responses.push({ course, type, title, id: item.id, url, text, data: item });
        }
    }
    return responses;
}

interface SearchError {
    course: Course;
    type: string;
    attributes: string[];
    error: any;
}

export async function actualSearch(request: SearchRequest): Promise<SearchResponse[]> {
    console.log(request);
    // Get all relevant courses
    const options: Record<string, any> = { "per_page": 100};
    if (request.across !== "all") {
        options["state[]"] = request.across === "published" ? ["available", "completed"] : ["unpublished"];
    }
    const responses: SearchResponse[] = [];
    const errors: SearchError[] = [];
    let courses = await getAllWithoutCourse($.get, getBaseApiUrl() + "courses", options);
    courses = courses.slice(0, 10);
    updateSearchStatus(`Searching ${courses.length} courses...`);
    let coursesCompleted = 0;
    for (const course of courses) {
        // Search each course
        const courseResponses: SearchResponse[] = [];
        for (const key of Object.keys(request.resources)) {
            const type = key;
            const attributes = request.resources[key];
            updateSearchStatus(`(${coursesCompleted + 1}/${courses.length}) Searching ${course.course_code} - ${type}...`);
            try {
                const attrResponse = await searchResource(request.input, course, type, attributes);
                courseResponses.push(...attrResponse);
                updateSearchStatus(`(${coursesCompleted + 1}/${courses.length}) Searched ${course.course_code} - Found ${attrResponse.length} ${type}`);
            } catch (e) {
                errors.push({course, type, attributes, error: e});
                console.error(`Error searching ${course.course_code} - ${type}`, e);
                updateSearchStatus(`(${coursesCompleted + 1}/${courses.length}) Error searching ${course.course_code} - ${type}`);
            }
        }
        responses.push(...courseResponses);
        updateSearchStatus(`(${coursesCompleted + 1}/${courses.length}) Searched ${course.course_code} - Found ${courseResponses.length} results`);
        coursesCompleted++;
    }
    updateSearchStatus(`Search complete, found ${responses.length} results`);
    return responses;
}

function updateSearchStatus(text: string) {
    $("#search-dialog-status").text(text);
}

declare global {
    interface JQuery {
        queryBuilder(options: any): any;
    }
}

export async function setupSearch() {
    const input = $("#search-dialog-input");
    const results = $("#search-dialog-results-list");
    const status = $("#search-dialog-status");
    const search = async () => {
        const query = input.val() as string;
        if (!query) {
            return;
        }
        results.empty();
        status.text("Searching...");
        const request = buildRequest();
        const searchResults = await actualSearch(request);
        status.text(`Found ${searchResults.length} results`);
        searchResults.forEach((response) => {
            results.append(`
            <div style="border: 1px solid black; padding: 0.5em; margin: 0.5em">
                <strong>${response.course.course_code} - ${response.type}</strong>
                <div><a href="${response.url}">${response.title}</a></div>
                <div>${response.text}</div>
            </div>`);
        });
    };
    input.on("input", () => {
        $("#search-dialog-submit").prop("disabled", !input.val());
    });
    input.on("keypress", (e) => {
        $("#search-dialog-submit").prop("disabled", !input.val());
        if (e.key === "Enter" && input.val()) {
            search();
        }
    });
    $("#search-dialog-submit").on("click", search);

    // Hide and show attributes based on type
    Object.keys(SEARCHABLE_RESOURCES).forEach((key) => {
        const type = $(`#search-dialog-type-${key}`);
        const attributes = $(`#search-dialog-attr-${key}`);
        type.on("change", () => {
            attributes.css("display", type.prop("checked") ? "block" : "none");
        });
    });

    // Hide and show choose courses based on across
    const across = $("#search-dialog-across");
    const choose = $("#search-dialog-choose-courses");
    across.on("change", async () => {
        const shouldShow = across.val() === "choose";
        choose.css("display", shouldShow ? "block" : "none");
        if (shouldShow) {
            // Get all courses
            // TODO: Make this cache
            const coursesSelect = $("#search-dialog-courses");
            coursesSelect.empty();
            coursesSelect.append(`<option value="">LOADING</option>`);
            const courses = await getAllWithoutCourse($.get, getBaseApiUrl() + "courses", { "per_page": 100});
            coursesSelect.empty();
            courses.forEach((course: Course) => {
                coursesSelect.append(`<option value="${course.id}">${course.course_code} - ${course.name}</option>`);
            });
        }
    });
}

export async function injectSearchButton(menu: HTMLElement | null) {
    if (!menu) {
        return;
    }
    $(menu).append(SEARCH_MENU_ITEM);
    $("#global_nav_search_link").on("click", (e) => {
        e.preventDefault();
        startDialog("Search across courses", SEARCH_DIALOG_HTML);
        setupSearch();
    });
}