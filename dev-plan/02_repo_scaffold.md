# 02 Repo Scaffold

Source sections: 5, 14, 15, 16, 26, 34, 42.
Atomic aspect: repo bootstrap only.
Prerequisite: step 01.

## Goal

Create the runnable project skeleton that matches the target folder structure and route inventory.

## Implement

1. Initialize the Next.js App Router project in JavaScript and commit the package lockfile.
2. Add the top-level folder structure from section 14.
3. Create placeholder route files for every mandatory public and admin page listed in section 5.
4. Add the styled-components registry scaffold and theme entry point.
5. Add the Redux provider, empty slice folders, and store bootstrap.
6. Add baseline scripts for linting, testing, Prisma, and development.
7. Add placeholder API route files for the required handlers in section 26.
8. Add the `en` locale message file and wire the scaffold so future locales can be added by adding a new locale file and registering it in configuration.

## Required Outputs

- a bootable app
- route placeholders for all required pages
- API route placeholders for all required endpoints
- a folder tree that matches section 14

## Verify

- the app starts locally
- lint and test commands run without scaffold errors
- every route named in sections 5 and 26 exists as a file placeholder

## Exit Criteria

- later steps can add behavior without restructuring the app
