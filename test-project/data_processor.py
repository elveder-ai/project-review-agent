#!/usr/bin/env python3

import os
import sys
import subprocess
import pickle
import sqlite3

# Hardcoded credentials (insecure)
DB_PASSWORD = "super_secret_password123"

# Insecure file operation
def read_user_file(filename):
    # Path traversal vulnerability
    with open(filename, 'r') as f:
        return f.read()

# Command injection vulnerability
def run_command(user_input):
    # Dangerous command execution
    result = os.system("echo " + user_input)
    return result

# Insecure deserialization
def load_data(file_path):
    with open(file_path, 'rb') as f:
        # Insecure deserialization
        data = pickle.load(f)
    return data

# SQL Injection vulnerability
def get_user(user_id):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # SQL Injection vulnerability
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    
    result = cursor.fetchone()
    conn.close()
    return result

# Insecure random values
import random

def generate_token():
    # Weak random generator
    return "".join(random.choice("0123456789ABCDEF") for i in range(16))

if __name__ == "__main__":
    print("Data processor started")
    token = generate_token()
    print(f"Generated token: {token}") 