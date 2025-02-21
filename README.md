> [!IMPORTANT]
> As of now, this project is marked as completed and will only receive minor changes, as I am busy with other work. Peace out 🕊️

<h1 align="center">
  <img align="center" src="https://imgs1cdn.adultempire.com/bn/favico_ae_114x114.png" alt="ae logo" width="66" /> </br>
  Adult Empire
</h1>

<p align="center">
  <i>
 This project is in development as for now.
</i>
  <br />
  <br />
  <img src="https://img.shields.io/badge/NodeJS-8A2BE2" alt="nodejs" />
  <br/>
</p>

<h2 align="center">
  Introduction
</h2>
<p align="center">
  Welcome to the AE Project. This project is created for educational purposes only.</br >
</p>

## Features

- Next.js app router with TypeScript for easier adaptation and faster learning for beginners.
- Minimal design to keep the application lightweight.
- Since I’m working solo on this project, implementing new features takes some time.

## Where Used What (Libraries):

- **Next.js**:

  - The entire application is wrapped with Next.js (using the `app/` router) and TypeScript.
  - **Why use Next.js instead of Vite-ReactJS or CRA (Create React App)?**: While Vite and CRA are great choices, I chose Next.js for its built-in features like server-side rendering (SSR) and static site generation (SSG). Another key reason is to leverage `next-auth` for authentication and its seamless integration with React.

## For local development

- Clone the repository.

  ```bash
  git clone https://github.com/Zeddxx/ani-fire.git
  ```

- Install the npm or yarn or pnpm.

  ```bash
  npm install or yarn add or pnpm install
  ```

- Add the `.env` on root directory.
  > [!TIP]
  > path: root to anifire outside the app directory

```bash
## This should be a aniwatch api of ritesh repo (without last slash /)
NEXT_PUBLIC_BASE_ANIME_URL=E.G -> base_url/api/v2/hianime
```

## TODO'S

- [ ] Add Dashboard
- [ ] User authentication.
- [ ] Add commenting feature
  - [ ] Add nested comments.
- [ ] Implement admin dashboard functionality.
- [ ] Share buttons.
- [ ] Added Dub functionality.
- [x] Episode next and previous button.
  - [ ] Theater mode
  - [ ] Focus mode.
- [ ] Store users wishlist anime into database.
- [ ] SEO implementation.

