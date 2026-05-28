import os
import subprocess

# Issue 1: SQL injection vulnerability  
def get_user(user_id):
    query = 'SELECT * FROM users WHERE id = ' + user_id
    return query

# Issue 2: Hardcoded secret
API_KEY = 'sk-1234567890abcdef'

# Issue 3: Command injection
def run_cmd(cmd):
    os.system(cmd)

# Issue 4: Insecure use of subprocess
def execute(command):
    subprocess.call(command, shell=True)

# Issue 5: Unreachable code
def process():
    return True
    print('This never runs')
