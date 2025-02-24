import { DatabaseError } from '../middleware/errorMiddleware';
import pool from '../utils/db';
import { RowDataPacket } from 'mysql2';

interface MovieRow extends RowDataPacket {
  id: number;
  tmdb_id: number;
  title: string;
  description: string;
  release_date: string;
  runtime: number;
  poster_image: string;
  backdrop_image: string;
  user_rating: number;
  mpa_rating: string;
  created_at: Date;
  updated_at: Date;
  genres: string;
  streaming_services: string;
}

interface MovieJson {
  id: number;
  tmdbId: number;
  title: string;
  description: string;
  releaseDate: string;
  runtime: number;
  posterImage: string;
  backdropImage: string;
  streamingServices: string;
  genres: string;
  lastUpdated: string;
}

function movieToJson(movie: MovieRow): MovieJson {
  return {
    id: movie.id,
    tmdbId: movie.tmdb_id,
    title: movie.title,
    description: movie.description,
    releaseDate: movie.release_date,
    runtime: movie.runtime,
    posterImage: movie.poster_image,
    backdropImage: movie.backdrop_image,
    streamingServices: movie.streaming_services,
    genres: movie.genres,
    lastUpdated: movie.updated_at.toISOString(),
  };
}

export async function getMoviesCount() {
  try {
    const query = `SELECT COUNT(DISTINCT m.id) AS total FROM movies m`;
    const [result] = await pool.query<(RowDataPacket & { total: number })[]>(query);
    return result[0].total;
  } catch (error) {
    throw new DatabaseError('Database error when retrieving movies count', error);
  }
}

export async function getAllMovies(limit: number = 50, offset: number = 0) {
  try {
    const query = `SELECT 
    m.id,
	m.tmdb_id,
    m.title,
    m.description,
    m.release_date,
    m.runtime,
    m.poster_image,
	m.backdrop_image,
    m.user_rating,
    m.mpa_rating,
    m.created_at,
    m.updated_at,
    GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
	GROUP_CONCAT(DISTINCT ss.name SEPARATOR ', ') AS streaming_services
FROM 
    movies m
LEFT JOIN 
    movie_genres mg ON m.id = mg.movie_id
LEFT JOIN 
    genres g ON mg.genre_id = g.id
LEFT JOIN
	movie_services ms ON m.id = ms.movie_id
LEFT JOIN
	streaming_services ss on ms.streaming_service_id = ss.id
GROUP BY 
	m.id
ORDER BY
    m.title
LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}`;
    const [movies] = await pool.execute<MovieRow[]>(query);
    return movies.map((movie) => movieToJson(movie));
  } catch (error) {
    throw new DatabaseError('Database error when retrieving all movies', error);
  }
}
