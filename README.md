● Issue Automations

  When you create an issue in the plan repository:

  - Issue type is automatically set based on the title prefix (EPIC, FEATURE, STORY, or TASK)
  - Issue is added to the EngageMe project
  - Project Type field is set to match the title prefix

  When you link issues from other repositories (like calendar) as children:

  To trigger the automation, add the "sync" label to the parent issue
  - Child issue type is set based on its title prefix
  - Child is added to the EngageMe project
  - Child inherits the parent's iteration
  - Child inherits all labels from the parent (except "sync")
  - The "sync" label removes itself automatically when done

  When you add or remove labels on a parent issue:

  - All children and grandchildren get the same label added or removed
  - Works across all repositories
  - The "sync" label is not cascaded to children

  When you change the milestone on a parent issue:

  - All children and grandchildren in the same repository get the updated milestone
  - Cross-repository children are skipped (milestones are repository-specific)

  When you close a parent issue:

  - All children are closed automatically
  - All grandchildren are closed automatically
  - Works across all repositories

  When all children of an issue are closed:

  - The parent issue closes automatically
  - Only works within the plan repository

  When you reopen a child issue:

  - The parent issue reopens automatically if it was closed
  - Only works within the plan repository