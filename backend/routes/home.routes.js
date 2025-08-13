export default async function homeRoutes(app) {
    app.get('/', async (request, reply) => {
        console.log(new Date().toLocaleTimeString())
        return { message: 'PONG GAME!' };
    });
}
