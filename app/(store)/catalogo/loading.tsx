export default function Loading() {
  return (
    <div className="container page" aria-busy="true" aria-label="Carregando produtos">
      <div className="cat-head">
        <div className="sk sk-line" style={{ width: 120 }} />
        <div className="sk sk-title" />
      </div>
      <div className="cat-layout">
        <div className="cat-side sk-side">
          <div className="sk sk-line" />
          <div className="sk sk-line" />
          <div className="sk sk-line" />
        </div>
        <div className="pgrid pgrid-cat">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="sk sk-media" />
              <div className="sk sk-line" style={{ width: "70%", marginTop: 12 }} />
              <div className="sk sk-line" style={{ width: "35%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
