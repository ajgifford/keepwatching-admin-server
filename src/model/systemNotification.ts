import { BadRequestError, DatabaseError, NoAffectedRowsError, NotFoundError } from '../middleware/errorMiddleware';
import pool from '../utils/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface NotificationRow extends RowDataPacket {
  notification_id: number;
  message: string;
  start_date: Date;
  end_date: Date;
  send_to_all: number;
  account_id: number | null;
}

interface NotificationJSON {
  notification_id?: number;
  message: string;
  start_date: string;
  end_date: string;
  send_to_all: boolean;
  account_id: number | null;
}

interface AccountRow extends RowDataPacket {
  account_id: number;
}

class SystemNotification {
  notification_id?: number;
  message: string;
  start_date: Date;
  end_date: Date;
  send_to_all: boolean;
  account_id: number | null;

  constructor(
    message: string,
    start_date: Date | string,
    end_date: Date | string,
    send_to_all: boolean,
    account_id: number | null,
    notification_id?: number,
  ) {
    this.message = message;
    this.start_date = start_date instanceof Date ? start_date : new Date(start_date);
    this.end_date = end_date instanceof Date ? end_date : new Date(end_date);
    this.send_to_all = send_to_all;
    this.account_id = account_id;
    if (notification_id) this.notification_id = notification_id;
  }

  toJSON(): NotificationJSON {
    return {
      notification_id: this.notification_id,
      message: this.message,
      start_date: this.start_date.toISOString(),
      end_date: this.end_date.toISOString(),
      send_to_all: this.send_to_all,
      account_id: this.account_id,
    };
  }

  async save() {
    const connection = await pool.getConnection();
    try {
      const notificationQuery =
        'INSERT INTO notifications (message, start_date, end_date, send_to_all, account_id) VALUES (?,?,?,?,?)';
      const [result] = await connection.execute<ResultSetHeader>(notificationQuery, [
        this.message,
        this.start_date,
        this.end_date,
        this.send_to_all,
        this.account_id,
      ]);
      this.notification_id = result.insertId;

      if (this.send_to_all) {
        const [accounts] = await connection.query<AccountRow[]>('SELECT account_id FROM accounts');

        if (accounts.length === 0) {
          throw new NotFoundError('No accounts found when sending a notification to all accounts');
        }

        const values = accounts.map((account) => [this.notification_id, account.account_id, false]);

        await connection.execute(
          'INSERT INTO account_notifications (notification_id, account_id, dismissed) VALUES ?',
          [values],
        );
      } else {
        await connection.execute(
          'INSERT INTO account_notifications (notification_id, account_id, dismissed) VALUES (?,?,?)',
          [this.notification_id, this.account_id, false],
        );
      }

      await connection.commit();
    } catch (error) {
      connection.rollback();
      throw new DatabaseError('', error);
    } finally {
      connection.release();
    }
  }

  async update() {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE notifications SET message = ?, start_date = ?, end_date = ?, send_to_all = ?, account_id = ? WHERE notification_id = ?',
        [this.message, this.start_date, this.end_date, this.send_to_all, this.account_id, this.notification_id],
      );

      if (result.affectedRows === 0) {
        throw new NoAffectedRowsError(`No notification found with ID ${this.notification_id}`);
      }

      return this.toJSON();
    } catch (error) {
      if (error instanceof NoAffectedRowsError) {
        throw error;
      }
      throw new DatabaseError('Database error while updating a notification', error);
    }
  }

  static async getAllNotifications(expired: boolean): Promise<NotificationJSON[]> {
    try {
      const query = expired
        ? 'SELECT * FROM notifications'
        : 'SELECT * FROM notifications WHERE NOW() BETWEEN start_date AND end_date';

      const [notifications] = await pool.execute<NotificationRow[]>(query);

      return notifications.map((row) =>
        new SystemNotification(
          row.message,
          row.start_date,
          row.end_date,
          Boolean(row.send_to_all),
          row.account_id,
          row.notification_id,
        ).toJSON(),
      );
    } catch (error) {
      throw new DatabaseError('Database error when retrieving all notifications', error);
    }
  }

  static async delete(notification_id: number): Promise<void> {
    try {
      const [result] = await pool.execute<ResultSetHeader>('DELETE FROM notifications WHERE notification_id = ?', [
        notification_id,
      ]);

      if (result.affectedRows === 0) {
        throw new NoAffectedRowsError(`No notification found with ID ${notification_id}`);
      }
    } catch (error) {
      if (error instanceof NoAffectedRowsError) {
        throw error;
      }
      throw new DatabaseError('Database error while deleting a notification', error);
    }
  }
}

export default SystemNotification;
