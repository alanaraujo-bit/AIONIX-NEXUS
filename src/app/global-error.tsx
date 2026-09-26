"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#07080b",
          color: "#e9ecf1",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>AIONIX NEXUS falhou ao iniciar</h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "#9ba3b0" }}>
            {error.digest ? `Referência ${error.digest}.` : "Erro inesperado na raiz da aplicação."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              height: 36,
              padding: "0 16px",
              borderRadius: 8,
              border: "none",
              background: "#7c85ff",
              color: "#0a0b10",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
