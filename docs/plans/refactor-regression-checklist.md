# Theatre Diary Refactor Regression Checklist

Use this list after each refactor phase to confirm no behavior changes.

## My Shows

- List mode loads ranked items and shows tier headers/special lines.
- Dragging a ranked show reorders it and persists after refresh.
- Dragging an unranked show into ranked area ranks it.
- Dragging a ranked show into unranked area unranks it.
- Dragging special lines updates their positions.
- Removing a show works and loading/removal state is shown.
- Cloud mode opens details modal and can navigate to show details.
- Diary mode still renders and toggles correctly.

## Add Visit

- Show search returns matches and selecting result sets show selection.
- Custom show path creates selection from typed text.
- Suggestions render when query is empty.
- Production chips load for selected show and "Other" location still works.
- Keep Current Ranking toggle works when ranking already exists.
- Tier selection/comparison flow can produce a final ranking position.
- Save Visit creates visit and returns to main tab.
- Unsaved-change guard appears and discard continues navigation.

## List Detail

- List screen title and count render from params/data.
- System list info card toggle works.
- Custom list description edit/save/cancel works.
- Add-show search opens, filters, and adds selected show.
- Tapping a show opens show details.

## Show Detail

- Header title still uses route params fallback.
- Show stats/visits load correctly.
- Visit row opens visit details.
- Add a Visit button navigates to add-visit flow.

## Visit Detail

- Visit loads from ID and shows fallback for not found.
- Show link opens show details route.
- Date/location/notes fields render exactly as before.

