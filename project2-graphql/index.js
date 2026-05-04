import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

const PORT = process.env.PORT || 4000;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Enables Apollo Explorer in development
  introspection: true,
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
});

const { url } = await startStandaloneServer(server, {
  listen: { port: Number(PORT) },
});

console.log(`\n🎬 Movie Ratings GraphQL API`);
console.log(`   GraphQL endpoint: ${url}`);
console.log(`   Apollo Explorer:  ${url} (open in browser)\n`);
console.log(`   Example queries to try in the Explorer:`);
console.log(`   - Query all movies: { movies { title year averageRating } }`);
console.log(`   - Filter by genre: { movies(genre: "Sci-Fi") { title director { name } } }\n`);
