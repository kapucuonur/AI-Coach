import sqlite3

def migrate_db():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    
    # 1. Create the new table
    cursor.execute("""
    CREATE TABLE users_new (
        id INTEGER NOT NULL, 
        email VARCHAR NOT NULL, 
        hashed_password VARCHAR, 
        google_id VARCHAR,
        facebook_id VARCHAR,
        garmin_email VARCHAR, 
        garmin_password VARCHAR, 
        PRIMARY KEY (id)
    );
    """)
    
    # 2. Copy data
    cursor.execute("""
    INSERT INTO users_new (id, email, hashed_password, garmin_email, garmin_password)
    SELECT id, email, hashed_password, garmin_email, garmin_password FROM users;
    """)
    
    # 3. Drop old table
    cursor.execute("DROP TABLE users;")
    
    # 4. Rename new table
    cursor.execute("ALTER TABLE users_new RENAME TO users;")
    
    # 5. Recreate Indices
    cursor.execute("CREATE UNIQUE INDEX ix_users_email ON users (email);")
    cursor.execute("CREATE INDEX ix_users_id ON users (id);")
    cursor.execute("CREATE UNIQUE INDEX ix_users_google_id ON users (google_id);")
    cursor.execute("CREATE UNIQUE INDEX ix_users_facebook_id ON users (facebook_id);")
    
    conn.commit()
    conn.close()
    print("Migration successful.")

if __name__ == '__main__':
    migrate_db()
