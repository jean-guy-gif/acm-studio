-- ACM Studio — Enforce one subject property per project.
-- A concurrency test demonstrated that two simultaneous saves could create two
-- subject_properties rows for the same project. This UNIQUE constraint makes the
-- "one project → one subject property" business rule enforceable at the database
-- level and enables a safe upsert (ON CONFLICT) strategy in the save action.
alter table public.subject_properties
  add constraint subject_properties_project_id_key unique (project_id);
