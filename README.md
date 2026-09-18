# Calculate gambling money

Small React app for tracking players, round points, ranking, and the current point-to-money conversion for a card table.

Built with React, Vite, and Tailwind CSS.

## Features

- Add players and assign a host.
- Edit player names and total points.
- Retire and restore players without losing their points.
- Enter round results and calculate the host's points automatically.
- Browse round history with pagination and player detail charts.
- View the ranking of active and retired players.
- Copy ranking text in the format `name | points | converted money`.
- Download the full ranking chart as a PNG, including players outside the mobile scroll viewport.
- Configure the current table rate, for example `1 point = 5,000đ`.
- Light and dark themes.

The default conversion rate is `1 point = 1,000đ`. The rate is stored in `localStorage` as a numeric `pointValueVnd` value and is used dynamically for the main screen, player screens, ranking copy output, and ranking chart.

## Local development

```sh
npm install
npm run dev
```

Open the URL printed by Vite. To check the production output, run `npm run build` and `npm run preview`.

Run the automated tests with:

```sh
npm test
```

There are no separate lint or typecheck scripts in this project.

The Vite `base` is set to `/calculate-gambling-money/` for this repository's GitHub Pages URL.

## Production build

```sh
npm run build
npm run preview
```

The generated files are placed in `dist/`. A push to `main` runs the GitHub Pages workflow, which tests the app, builds `dist/`, and deploys it at `https://ngtrdung.github.io/calculate-gambling-money/`.

## Source structure

```text
src/
├── app/
│   └── App.jsx
├── components/
│   └── ui/
│       └── Dialog.jsx
├── features/
│   ├── players/
│   ├── rounds/
│   ├── history/
│   ├── ranking/
│   └── settings/
├── storage/
├── styles/
└── main.jsx
```

Feature logic and its tests live together. Shared UI primitives are kept in `components/ui`, persistence infrastructure is kept in `storage`, and `main.jsx` remains the Vite entry point.

## Ranking export

Ranking text follows the current point order from lowest to highest:

```text
Minh | -3 | -6k
Hoàng | 0 | 0k
Nam | +5 | +10k
```

The chart bars use points as their values. The money labels are derived from the current `pointValueVnd` setting, so changing the rate does not modify player totals or round history.
