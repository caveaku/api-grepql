import { v4 as uuidv4 } from "uuid";
import { GraphQLError } from "graphql";

// ─── In-memory data store ──────────────────────────────────────────────────────

export const directors = [
  { id: "d1", name: "Christopher Nolan", nationality: "British", birthYear: 1970 },
  { id: "d2", name: "Quentin Tarantino", nationality: "American", birthYear: 1963 },
  { id: "d3", name: "Denis Villeneuve", nationality: "Canadian", birthYear: 1967 },
  { id: "d4", name: "Greta Gerwig", nationality: "American", birthYear: 1983 },
];

export let movies = [
  {
    id: "m1",
    title: "Inception",
    year: 2010,
    genre: "Sci-Fi",
    directorId: "d1",
    ratings: [
      { userId: "user1", score: 5, comment: "Mind-blowing!", createdAt: "2024-01-10T10:00:00Z" },
      { userId: "user2", score: 4, comment: "Great visuals", createdAt: "2024-01-11T12:00:00Z" },
    ],
  },
  {
    id: "m2",
    title: "Pulp Fiction",
    year: 1994,
    genre: "Crime",
    directorId: "d2",
    ratings: [
      { userId: "user1", score: 5, comment: "A masterpiece", createdAt: "2024-01-05T09:00:00Z" },
      { userId: "user3", score: 5, comment: "Iconic", createdAt: "2024-01-06T14:00:00Z" },
    ],
  },
  {
    id: "m3",
    title: "Dune",
    year: 2021,
    genre: "Sci-Fi",
    directorId: "d3",
    ratings: [
      { userId: "user2", score: 4, comment: "Epic scope", createdAt: "2024-02-01T11:00:00Z" },
    ],
  },
  {
    id: "m4",
    title: "Barbie",
    year: 2023,
    genre: "Comedy",
    directorId: "d4",
    ratings: [
      { userId: "user1", score: 4, comment: "Surprisingly deep", createdAt: "2024-03-01T15:00:00Z" },
      { userId: "user4", score: 3, comment: "Fun but shallow", createdAt: "2024-03-02T16:00:00Z" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const computeAverage = (ratings) => {
  if (!ratings.length) return null;
  return ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
};

// ─── Resolvers ────────────────────────────────────────────────────────────────

export const resolvers = {
  // Field-level resolver: Movie -> director (lazy — only called when requested)
  Movie: {
    director: (movie) => directors.find((d) => d.id === movie.directorId),
    averageRating: (movie) => computeAverage(movie.ratings),
    totalRatings: (movie) => movie.ratings.length,
  },

  Query: {
    movies: (_, { genre }) => {
      if (genre) return movies.filter((m) => m.genre.toLowerCase() === genre.toLowerCase());
      return movies;
    },

    movie: (_, { id }) => {
      const movie = movies.find((m) => m.id === id);
      if (!movie) throw new GraphQLError(`Movie with id "${id}" not found`, {
        extensions: { code: "NOT_FOUND" },
      });
      return movie;
    },

    topMovies: (_, { limit }) => {
      return [...movies]
        .map((m) => ({ ...m, avg: computeAverage(m.ratings) ?? 0 }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, limit);
    },

    directors: () => directors,
  },

  Mutation: {
    addMovie: (_, { input }) => {
      const director = directors.find((d) => d.id === input.directorId);
      if (!director) throw new GraphQLError(`Director with id "${input.directorId}" not found`, {
        extensions: { code: "NOT_FOUND" },
      });

      const movie = { id: uuidv4(), ...input, ratings: [] };
      movies.push(movie);
      return movie;
    },

    addRating: (_, { movieId, input }) => {
      if (input.score < 1 || input.score > 5) {
        throw new GraphQLError("Score must be between 1 and 5", {
          extensions: { code: "BAD_USER_INPUT", field: "score" },
        });
      }

      const movie = movies.find((m) => m.id === movieId);
      if (!movie) throw new GraphQLError(`Movie with id "${movieId}" not found`, {
        extensions: { code: "NOT_FOUND" },
      });

      const existing = movie.ratings.findIndex((r) => r.userId === input.userId);
      const rating = { ...input, createdAt: new Date().toISOString() };

      if (existing >= 0) {
        // Update existing rating instead of duplicating
        movie.ratings[existing] = rating;
      } else {
        movie.ratings.push(rating);
      }

      return movie;
    },

    deleteMovie: (_, { id }) => {
      const index = movies.findIndex((m) => m.id === id);
      if (index === -1) throw new GraphQLError(`Movie with id "${id}" not found`, {
        extensions: { code: "NOT_FOUND" },
      });
      movies.splice(index, 1);
      return { success: true, message: `Movie "${id}" deleted successfully` };
    },
  },
};
