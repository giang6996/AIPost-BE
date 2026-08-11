pipeline {
    agent any

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
                '''
            }
        }

        stage('Generate Prisma Client') {
            environment {
                DATABASE_URL = 'postgresql://aipost_test:aipost_test_password@127.0.0.1:5433/aipost_test'
            }

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