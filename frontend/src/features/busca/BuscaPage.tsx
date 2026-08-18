export function BuscaPage() {
  return (
    <>
      <div className="box">
        <div className="box-head">
          <h2>Busca automática nos tribunais</h2>
          <span className="status-tag status-wait">Não implementado</span>
        </div>
        <p className="muted">
          A ideia original era um robô consultando os tribunais pelo CNPJ da empresa e
          cadastrando sozinho qualquer processo novo em que ela fosse citada — antes da
          carta chegar. Isso <strong>não saiu do papel</strong>, e o motivo está
          registrado aqui para ninguém tentar o mesmo caminho de novo.
        </p>
      </div>

      <div className="box">
        <h2>Por que travou</h2>
        <div className="detail-grid">
          <div>
            <small>DataJud / CNJ</small>
            <strong>
              API pública e gratuita, mas não expõe o nome das partes. Só dá para
              consultar por número de processo, classe e órgão julgador.
            </strong>
          </div>
          <div>
            <small>Buscar por CNPJ</small>
            <strong>
              É justamente o que os agregadores pagos vendem: Escavador, JusBrasil,
              Digesto, Judit.
            </strong>
          </div>
          <div>
            <small>Sistemas dos tribunais</small>
            <strong>
              Exigem login ou certificado dos advogados, que não são liberados.
            </strong>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-head">
          <h2>O caminho que ainda vale investigar</h2>
          <span className="status-tag status-ok">Custo zero</span>
        </div>
        <p className="muted">
          A <strong>API Comunica / DJEN do CNJ</strong>{" "}
          (<span className="mono">comunicaapi.pje.jus.br</span>) centraliza as intimações
          e publicações eletrônicas de todos os tribunais, é pública, e permite consulta{" "}
          <strong>por número de OAB</strong> — informação pública, que já está cadastrada
          em cada advogado aqui no sistema. Não depende de login nem de senha de ninguém,
          que era exatamente o impedimento.
        </p>
        <div className="detail-grid">
          <div>
            <small>Cobre</small>
            <strong>Processos com publicação vinculada a um advogado da casa</strong>
          </div>
          <div>
            <small>Não cobre</small>
            <strong>Processo novo que ainda não teve nenhuma publicação</strong>
          </div>
          <div>
            <small>Onde rodaria</small>
            <strong>Edge Function do Supabase, agendada por pg_cron</strong>
          </div>
          <div>
            <small>Antes de investir</small>
            <strong>Confirmar os endpoints atuais — a API já mudou algumas vezes</strong>
          </div>
        </div>
      </div>
    </>
  );
}
