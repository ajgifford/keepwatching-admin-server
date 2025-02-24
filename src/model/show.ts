import { DatabaseError } from '../middleware/errorMiddleware';
import pool from '../utils/db';
import { RowDataPacket } from 'mysql2';

interface ShowRow extends RowDataPacket {
  id: number;
  tmdb_id: number;
  title: string;
  description: string;
  release_date: string;
  poster_image: string;
  backdrop_image: string;
  network: string;
  season_count: number;
  episode_count: number;
  user_rating: number;
  content_rating: string;
  status: string;
  type: string;
  in_production: number;
  last_air_date: string;
  created_at: Date;
  updated_at: Date;
  genres: string;
  streaming_services: string;
}

interface ShowJson {
  id: number;
  tmdbId: number;
  title: string;
  description: string;
  releaseDate: string;
  posterImage: string;
  backdropImage: string;
  network: string;
  seasonCount: number;
  episodeCount: number;
  streamingServices: string;
  genres: string;
  status: string;
  type: string;
  inProduction: boolean;
  lastAirDate: string;
  lastUpdated: string;
}

function showToJson(show: ShowRow): ShowJson {
  return {
    id: show.id,
    tmdbId: show.tmdb_id,
    title: show.title,
    description: show.description,
    releaseDate: show.release_date,
    posterImage: show.poster_image,
    backdropImage: show.backdrop_image,
    network: show.network,
    seasonCount: show.season_count,
    episodeCount: show.episode_count,
    status: show.status,
    type: show.type,
    inProduction: Boolean(show.in_production),
    lastAirDate: show.last_air_date,
    lastUpdated: show.updated_at.toISOString(),
    streamingServices: show.streaming_services,
    genres: show.genres,
  };
}

export async function getShowsCount() {
  try {
    const query = `SELECT COUNT(DISTINCT s.id) AS total FROM shows s`;
    const [result] = await pool.query<(RowDataPacket & { total: number })[]>(query);
    return result[0].total;
  } catch (error) {
    throw new DatabaseError('Database error when retrieving shows count', error);
  }
}

export async function getAllShows(limit: number = 50, offset: number = 0) {
  try {
    const query = `SELECT 
    s.id,
	s.tmdb_id,
    s.title,
    s.description,
    s.release_date,
    s.poster_image,
	s.backdrop_image,
    s.network,
    s.season_count,
    s.episode_count,
    s.user_rating,
    s.content_rating,
    s.status,
    s.type,
    s.in_production,
    s.last_air_date,
    s.created_at,
    s.updated_at,
    GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') AS genres,
	GROUP_CONCAT(DISTINCT ss.name SEPARATOR ', ') AS streaming_services
FROM 
    shows s
LEFT JOIN 
    show_genres sg ON s.id = sg.show_id
LEFT JOIN 
    genres g ON sg.genre_id = g.id
LEFT JOIN
	show_services shs ON s.id = shs.show_id
LEFT JOIN
	streaming_services ss on shs.streaming_service_id = ss.id
GROUP BY 
	s.id
ORDER BY
    s.title
LIMIT ${parseInt(limit.toString())} OFFSET ${parseInt(offset.toString())}`;
    const [shows] = await pool.execute<ShowRow[]>(query);
    return shows.map((show) => showToJson(show));
  } catch (error) {
    throw new DatabaseError('Database error when retrieving all shows', error);
  }
}
