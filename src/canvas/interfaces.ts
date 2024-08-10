export interface User {
    display_name: string;
    id: number,
    name: string,
    email?: string
}

export interface AssignmentDate {
    id?: number;
    base?: boolean;
    title: string;
    due_at: string;
    unlock_at: string;
    lock_at: string;
}

export type AssignmentDateWithName = AssignmentDate & { name: string };

export interface Assignment {
    id: number;
    name: string;
    description: string; // HTML fragment
    created_at: string;
    updated_at: string;
    due_at: string;
    lock_at: string;
    unlock_at: string;
    has_overrides: boolean;
    all_dates: AssignmentDate[];
    course_id: number;
    html_url: string;
    submissions_download_url: string;
    assignment_group_id: number;
    due_date_required: boolean;
    allowed_extensions: string[];
    max_name_length: number;
    grade_group_students_individually: boolean;
    peer_reviews: boolean;
    automatic_peer_reviews: boolean;
    peer_review_count: number;
    peer_reviews_assign_at: string;
    intra_group_peer_reviews: boolean;
    group_category_id: number;
    needs_grading_count: number;
    needs_grading_count_by_section: any;
    position: number;
    post_to_sis: boolean;
    integration_id: string;
    integration_data: any;
    points_possible: number;
    submission_types: string[];
    has_submitted_submissions: boolean;
    grading_type: string;
    grading_standard_id: number;
    published: boolean;
    unpublishable: boolean;
    only_visible_to_overrides: boolean;
    locked_for_user: boolean;
    lock_info: any;
    lock_explanation: string;
    quiz_id: number;
    anonymous_submissions: boolean;
    discussion_topic: any;
    freeze_on_copy: boolean;
    frozen: boolean;
    frozen_attributes: string[];
    submission: any;
    use_rubric_for_grading: boolean;
    rubric_settings: any;
    rubric: RubricCriterion[];
    assignment_visibility: string;
    overrides: AssignmentDate[];
    omit_from_final_grade: boolean;
    hide_in_gradebook: boolean;
    grader_count: number;
    final_grader_id: number;
    grader_comments_visible_to_graders: boolean;
    graders_anonymous_to_graders: boolean;
    grader_names_visible_to_final_grader: boolean;
    anonymous_grading: boolean;
    allowed_attempts: number;
    post_manually: boolean;
    score_statistics: any;
    anonymize_students: boolean;
    important_dates: boolean;
    original_course_id: number;
    original_assignment_id: number;
    original_lti_resource_link_id: number;
    original_assignment_name: string;
    original_quiz_id: number;
    workflow_state: string;
}


export interface Course {
    id: number;
    calendar: {
        ics: string;
    };
    course_code: string;
    created_at: string;
    end_at: string;
    default_view: string;
    enrollment_term_id: number;
    enrollments: any[];
    is_public: boolean;
    name: string;
    sis_course_id: number;
    start_at: string;
    time_zone: string;
    workflow_state: string;
}

export enum WorkflowState {
    submitted = "submitted",
    unsubmitted = "unsubmitted",
    graded = "graded",
    pending_review = "pending_review"
}

export interface Submission {
    id: number,
    user: User,
    assignment: Assignment,
    submitted_at: string,
    graded_at: string,
    grader_id: number,
    grade: string,
    score: number,
    late_policy_status: string|null,
    seconds_late: number,
    excused: boolean,
    workflow_state: WorkflowState,
    attachments: SubmissionAttachment[] | null,
    full_rubric_assessment?: FullRubricAssessment;
    submission_comments: Comment[];
    preview_url: string;
}

export interface Comment {
    author: User;
    author_id: number;
    author_name: string;
    avatar_path: string;
    comment: string;
    created_at: string;
    edited_at: string|null;
    id: number;
}

export interface SubmissionAttachment {
    url: string;
}

export type SubmissionGroup = {
    user_id: number,
    submissions: Submission[]
}

export interface SpeedGraderInfo {
    assignmentId: number;
    assignmentTitle: string;
    currentUser: User;
}

export interface FullRubricAssessment {
    assessor_id: number;
    assesor_name: string;
    data: RubricRating[]
}

export interface RubricRating {
    comments: string;
    comments_enabled: boolean;
    criterion_id: string;
    description: string;
    id: string;
    points: number;
}

export interface RubricCriterion {
    id: string;
    description: string;
    long_description: string;
    points: number;
}