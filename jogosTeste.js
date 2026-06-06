// jogosTeste.js
export const jogosDeTesteMock = [
    {
        id: 9991,
        data: new Date(), // Horário atual de hoje
        timeCasa: "Brasil (Teste)",
        timeVisitante: "Alemanha (Teste)",
        status: "IN_PLAY", // Ao vivo para testar o visual de jogo rolando
        fase: "GROUP_STAGE"
    },
    {
        id: 9992,
        data: new Date(new Date().setHours(new Date().getHours() + 2)), // Daqui a 2 horas
        timeCasa: "Portugal (Teste)",
        timeVisitante: "Argentina (Teste)",
        status: "TIMED", // Agendado
        fase: "GROUP_STAGE"
    },
    {
        id: 9993,
        data: new Date(new Date().setHours(new Date().getHours() - 3)), // 3 horas atrás
        timeCasa: "França (Teste)",
        timeVisitante: "Itália (Teste)",
        status: "FINISHED", // Finalizado
        fase: "LAST_16" // Para testar a categoria Oitavas de Final
    }
];