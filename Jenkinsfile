pipeline {
    agent any

    environment {
        DATABASE_URL = 'postgresql://aipost_test:aipost_test_password@127.0.0.1:5433/aipost_test'
        ENCRYPTION_KEY = "123456789012345678901234567890123456789012345678901234567890"
        CORS_ORIGINS="http://localhost:5173"
        MEDIA_STORAGE_PROVIDER="local"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Start Test Database') {
            steps {
                sh '''
                    docker rm -f aipost-test-db || true

                    docker run -d \
                      --name aipost-test-db \
                      -e POSTGRES_USER=aipost_test \
                      -e POSTGRES_PASSWORD=aipost_test_password \
                      -e POSTGRES_DB=aipost_test \
                      -p 5433:5432 \
                      postgres:16

                    npx prisma migrate deploy
                    npx prisma migrate status

                '''
            }
        }

        stage('Debug Database') {
            steps {
                sh '''
                    node -e "
                    const u = new URL(process.env.DATABASE_URL);
                    console.log('DB host:', u.hostname);
                    console.log('DB port:', u.port);
                    console.log('DB name:', u.pathname);
                    "
                '''
            }
        }

        stage('Generate Prisma Client') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            sh 'docker rm -f aipost-test-db || true'
        }

        success {
            echo 'AIPost backend CI succeeded.'
        }

        failure {
            echo 'AIPost backend CI failed.'
        }
    }
}