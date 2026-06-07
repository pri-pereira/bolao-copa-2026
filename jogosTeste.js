// jogosTeste.js

// 1. Jogos de teste baseados no dia de hoje (07/06/2026)
export const jogosDeTesteMock = [
  {
    id: 9991,
    team_a: "Brasil",
    team_b: "França",
    flag_a: "🇧🇷",
    flag_b: "🇫🇷",
    match_datetime: "2026-06-07T15:00:00.000Z", // Hoje às 15:00 UTC (12:00 BRT)
    group_name: "Grupo A",
    score_a: 1,
    score_b: 0,
    finished: false,
    status: "IN_PLAY" // Ao Vivo
  },
  {
    id: 9992,
    team_a: "Argentina",
    team_b: "Holanda",
    flag_a: "🇦🇷",
    flag_b: "🇳🇱",
    match_datetime: "2026-06-07T12:00:00.000Z", // Hoje às 12:00 UTC (09:00 BRT)
    group_name: "Grupo B",
    score_a: 2,
    score_b: 2,
    finished: true,
    status: "FINISHED" // Finalizado
  },
  {
    id: 9993,
    team_a: "Portugal",
    team_b: "Japão",
    flag_a: "🇵🇹",
    flag_b: "🇯🇵",
    match_datetime: "2026-06-07T21:00:00.000Z", // Hoje mais tarde às 21:00 UTC (18:00 BRT)
    group_name: "Grupo C",
    score_a: null,
    score_b: null,
    finished: false,
    status: "TIMED" // Agendado
  },
  {
    id: 9994,
    team_a: "Espanha",
    team_b: "Itália",
    flag_a: "🇪🇸",
    flag_b: "🇮🇹",
    match_datetime: "2026-06-08T18:00:00.000Z", // Amanhã
    group_name: "Oitavas",
    score_a: null,
    score_b: null,
    finished: false,
    status: "TIMED" // Agendado
  },
  {
    id: 9995,
    team_a: "Alemanha",
    team_b: "Uruguai",
    flag_a: "🇩🇪",
    flag_b: "🇺🇾",
    match_datetime: "2026-07-19T20:00:00.000Z", // Final da Copa
    group_name: "Final",
    score_a: null,
    score_b: null,
    finished: false,
    status: "TIMED" // Agendado
  }
];

// 2. Perfis de teste para o Ranking
export const perfisDeTesteMock = [
  { 
    id: "test_user_1", 
    apelido: "Pedro Silva", 
    avatar: "../avatars/avatar1.png",
    points_offset: 12,
    exact_offset: 2,
    partial_offset: 6
  },
  { 
    id: "test_user_2", 
    apelido: "Lucas Santos", 
    avatar: "../avatars/avatar2.png",
    points_offset: 9,
    exact_offset: 2,
    partial_offset: 3
  },
  { 
    id: "test_user_3", 
    apelido: "Mariana Costa", 
    avatar: "../avatars/avatar3.png",
    points_offset: 5,
    exact_offset: 1,
    partial_offset: 2
  }
];

// 3. Palpites de teste dos utilizadores fictícios para os Jogos 1 e 2
export const palpitesDeTesteMock = [
  // Pedro Silva (id: test_user_1) -> Cravou Jogo 2 (2x2) = +3 pts. Total: 12 + 3 = 15 pts.
  { id: 8001, profile_id: "test_user_1", match_id: 9991, score_a: 1, score_b: 0 },
  { id: 8002, profile_id: "test_user_1", match_id: 9992, score_a: 2, score_b: 2 },

  // Lucas Santos (id: test_user_2) -> Empate Jogo 2 (1x1) = +1 pt. Total: 9 + 1 = 10 pts.
  { id: 8003, profile_id: "test_user_2", match_id: 9991, score_a: 2, score_b: 1 },
  { id: 8004, profile_id: "test_user_2", match_id: 9992, score_a: 1, score_b: 1 },

  // Mariana Costa (id: test_user_3) -> Errou Jogo 2 (3x0) = +0 pts. Total: 5 + 0 = 5 pts.
  { id: 8005, profile_id: "test_user_3", match_id: 9991, score_a: 0, score_b: 2 },
  { id: 8006, profile_id: "test_user_3", match_id: 9992, score_a: 3, score_b: 0 }
];