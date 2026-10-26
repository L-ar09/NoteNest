import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="welcome">
      <section>
        <p className="eyebrow">NOTE NEST</p>
        <h1>A calmer place for your thoughts.</h1>
        <p>
          Your secure, personal workspace is being prepared. Sign-in and note management arrive next.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
