export const typeDefs = `#graphql

  # ── Types ──────────────────────────────────────────────────────────────────

  type Director {
    id: ID!
    name: String!
    nationality: String
    birthYear: Int
  }

  type Rating {
    userId: String!
    score: Int!
    comment: String
    createdAt: String!
  }

  type Movie {
    id: ID!
    title: String!
    year: Int!
    genre: String!
    director: Director!
    ratings: [Rating!]!
    averageRating: Float
    totalRatings: Int!
  }

  # ── Query ──────────────────────────────────────────────────────────────────

  type Query {
    """Get all movies, optionally filtered by genre"""
    movies(genre: String): [Movie!]!

    """Get a single movie by ID"""
    movie(id: ID!): Movie

    """Get top-rated movies"""
    topMovies(limit: Int = 5): [Movie!]!

    """Get all directors"""
    directors: [Director!]!
  }

  # ── Mutation ───────────────────────────────────────────────────────────────

  type Mutation {
    """Add a new movie to the database"""
    addMovie(input: AddMovieInput!): Movie!

    """Submit a rating for a movie (score must be 1–5)"""
    addRating(movieId: ID!, input: AddRatingInput!): Movie!

    """Delete a movie by ID"""
    deleteMovie(id: ID!): DeleteMovieResponse!
  }

  # ── Input types ────────────────────────────────────────────────────────────

  input AddMovieInput {
    title: String!
    year: Int!
    genre: String!
    directorId: ID!
  }

  input AddRatingInput {
    userId: String!
    score: Int!
    comment: String
  }

  # ── Response types ─────────────────────────────────────────────────────────

  type DeleteMovieResponse {
    success: Boolean!
    message: String!
  }
`;
