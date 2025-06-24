import { ApolloServer } from 'apollo-server-express';
import type { Express } from 'express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

export async function initGraphQL(app: Express): Promise<void> {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }) => ({ req }),
    });
    await server.start();
    // Disable Apollo's built-in CORS so we use the global middleware with credentials support
    server.applyMiddleware({ app, path: '/graphql', cors: false });
}