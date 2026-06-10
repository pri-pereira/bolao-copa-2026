'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Ajuste o caminho do seu cliente supabase se necessário
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [filtro, setFiltro] = useState('Todos'); // Todos, Pagos, Aguardando
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // 1. Verificar Segurança de Admin
  useEffect(() => {
    async function checarAdmin() {
      const { data: { user } } = await supabase.auth.getUser();

      // Defina aqui o seu e-mail de administrador ou a flag do banco
      if (!user || user.email !== 'priscillasantosp24@gmail.com') {
        router.push('/jogos'); // Expulsa o usuário comum para a página de jogos
      } else {
        setIsAdmin(true);
        carregarDados();
      }
    }
    checarAdmin();
  }, []);

  // 2. Buscar participantes do banco de dados real
  async function carregarDados() {
    setLoading(true);
    // Ajuste 'profiles' para o nome exato da sua tabela de usuários se for diferente
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setUsuarios(data);
    }
    setLoading(false);
  }

  // 3. Função para Alternar/Aprovar o Pix
  async function alternarStatusPix(id, statusAtual) {
    const { error } = await supabase
      .from('profiles')
      .update({ pixAprovado: !statusAtual })
      .eq('id', id);

    if (!error) {
      // Atualiza o estado local na hora para os contadores e listas mudarem visualmente
      setUsuarios(prev =>
        prev.map(u => (u.id === id ? { ...u, pixAprovado: !statusAtual } : u))
      );
    } else {
      alert('Erro ao atualizar status do Pix no Supabase.');
    }
  }

  // CÁLCULO DOS CONTADORES (Cards Resumo)
  const totalInscritos = usuarios.length;
  const totalPagantes = usuarios.filter(u => u.pixAprovado === true).length;
  const totalPendentes = usuarios.filter(u => !u.pixAprovado).length;

  // FILTRAGEM DA LISTA
  const usuariosExibidos = usuarios.filter(u => {
    if (filtro === 'Pagos') return u.pixAprovado === true;
    if (filtro === 'Aguardando') return !u.pixAprovado;
    return true; // 'Todos'
  });

  if (!isAdmin || loading) {
    return <div style={{ color: '#fff', padding: '20px' }}>Carregando Painel Administrativo...</div>;
  }

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#0f111a', minHeight: '100vh' }}>

      <h2>Painel de Controle do Administrador</h2>
      <p style={{ color: '#888' }}>Gerencie as inscrições e liberações do Pix Estático</p>

      {/* 1. CARDS RESUMO */}
      <div style={{ display: 'flex', gap: '15px', margin: '20px 0' }}>
        <div style={{ flex: 1, background: '#1f2335', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #41a5f5' }}>
          <span style={{ fontSize: '14px', color: '#aaa' }}>Inscritos</span>
          <h3 style={{ fontSize: '24px', margin: '5px 0' }}>{totalInscritos}</h3>
        </div>
        <div style={{ flex: 1, background: '#1f2335', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #9ece6a' }}>
          <span style={{ fontSize: '14px', color: '#aaa' }}>Pagantes</span>
          <h3 style={{ fontSize: '24px', margin: '5px 0', color: '#9ece6a' }}>{totalPagantes}</h3>
        </div>
        <div style={{ flex: 1, background: '#1f2335', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f7768e' }}>
          <span style={{ fontSize: '14px', color: '#aaa' }}>Faltam Pagar</span>
          <h3 style={{ fontSize: '24px', margin: '5px 0', color: '#f7768e' }}>{totalPendentes}</h3>
        </div>
      </div>

      {/* 2. BOTÕES DE FILTRO RÁPIDO */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setFiltro('Todos')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: filtro === 'Todos' ? '#9ece6a' : '#24283b', color: filtro === 'Todos' ? '#000' : '#fff', cursor: 'pointer' }}>Todos</button>
        <button onClick={() => setFiltro('Pagos')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: filtro === 'Pagos' ? '#9ece6a' : '#24283b', color: filtro === 'Pagos' ? '#000' : '#fff', cursor: 'pointer' }}>Pagos</button>
        <button onClick={() => setFiltro('Aguardando')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: filtro === 'Aguardando' ? '#9ece6a' : '#24283b', color: filtro === 'Aguardando' ? '#000' : '#fff', cursor: 'pointer' }}>Aguardando Pagamento</button>
      </div>

      {/* 3. LISTAGEM DOS PARTICIPANTES */}
      <div style={{ background: '#1f2335', borderRadius: '8px', padding: '15px' }}>
        {usuariosExibidos.length === 0 ? (
          <p style={{ color: '#888' }}>Nenhum usuário encontrado para este filtro.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3b4261', color: '#aaa' }}>
                <th style={{ padding: '10px' }}>Nome</th>
                <th style={{ padding: '10px' }}>E-mail</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {usuariosExibidos.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #24283b' }}>
                  <td style={{ padding: '12px 10px' }}>{user.name || 'Sem nome'}</td>
                  <td style={{ padding: '12px 10px' }}>{user.email}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', background: user.pixAprovado ? '#2e3c25' : '#3c2529', color: user.pixAprovado ? '#9ece6a' : '#f7768e' }}>
                      {user.pixAprovado ? 'Pago' : 'Aguardando'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <button
                      onClick={() => alternarStatusPix(user.id, user.pixAprovado)}
                      style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: user.pixAprovado ? '#f7768e' : '#9ece6a', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      {user.pixAprovado ? 'Remover Acesso' : 'Marcar como Pago'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}