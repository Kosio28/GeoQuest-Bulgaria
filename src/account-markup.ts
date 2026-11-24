// Shared account view; behavior stays in account.ts.
export const accountMarkup = `  <dialog id="account-dialog" aria-labelledby="account-title">
    <div class="account-heading">
      <h2 id="account-title">Your account</h2>
      <form method="dialog"><button type="submit" data-label="Close account" aria-label="Close account">Close</button></form>
    </div>
    <p data-dynamic id="account-status" role="status"></p>
    <form id="account-form" hidden>
      <p>Sign in to save your games and see your past scores.</p>
      <label>Email <input name="email" type="email" autocomplete="email" required></label>
      <label>Password <input id="account-password" name="password" type="password" autocomplete="current-password" required></label>
      <div class="account-actions">
        <button class="primary" data-dynamic id="account-submit" type="submit">Sign in</button>
        <button data-dynamic id="account-switch" type="button">Create account</button>
      </div>
    </form>
    <section id="account-history" aria-labelledby="history-title" hidden>
      <form id="public-profile"><label><span data-en="Public username" data-bg="Публично име">Public username</span> <input name="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9А-Яа-я_ \-]{3,30}" required></label><button type="submit" data-en="Save username" data-bg="Запази името">Save username</button><p id="profile-status" role="status"></p></form>
      <p id="account-email"></p>
      <h3 id="history-title">Past scores</h3>
      <p data-dynamic id="history-status" role="status"></p>
      <ol data-dynamic id="history-scores"></ol>
      <div class="account-actions">
        <button id="history-more" type="button" hidden>Load more</button>
        <button id="sign-out" type="button">Sign out</button>
      </div>
    </section>
  </dialog>
`;
