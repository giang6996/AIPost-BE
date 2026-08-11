pipeline {
    agent any

    environment {
        AWS_REGION = "ap-southeast-1"

        ECR_REGISTRY = "596261186564.dkr.ecr.ap-southeast-1.amazonaws.com"
        ECR_REPOSITORY = "aipost-ec2-backend"

        DATABASE_URL = "postgresql://aipost_test:aipost_test_password@127.0.0.1:5433/aipost_test"
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

        stage('Prepare Image Metadata') {
            steps {
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_URI =
                        "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}"

                    echo "Docker image tag: ${env.IMAGE_TAG}"
                    echo "Docker image URI: ${env.IMAGE_URI}"
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    docker build \
                    -t ${IMAGE_URI} \
                    .
                '''
            }
        }

        stage('ECR Login') {
            steps {
                sh '''
                    aws ecr get-login-password \
                    --region ${AWS_REGION} \
                    | docker login \
                    --username AWS \
                    --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Push Image to ECR') {
            steps {
                sh '''
                    docker push ${IMAGE_URI}

                    docker tag \
                        ${IMAGE_URI} \
                        ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest

                    docker push \
                        ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest
                '''
            }
        }

        stage('Cleanup Local Docker Image') {
            steps {
                sh '''
                    docker image rm ${IMAGE_URI} || true
                    docker image rm ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest || true
                '''
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