export default async function homeRoutes(app) {
    app.get('/', async (request, reply) => {
        return { message: "Bienvenue sur la page d'accueil !" };
    });
}
