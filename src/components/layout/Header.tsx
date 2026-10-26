import styles from './layout.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="badge badge-primary">Schema: familialm</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Familia OS</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Administrador</div>
        </div>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--raio-full)',
            backgroundColor: 'var(--cor-primaria-suave)',
            color: 'var(--cor-primaria)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          FL
        </div>
      </div>
    </header>
  )
}
