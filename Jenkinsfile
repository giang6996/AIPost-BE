pipeline {
    agent any

    environment {
        AWS_REGION = "ap-southeast-1"

        IMAGE_TAG_PARAMETER = '/aipost/ec2/backend/IMAGE_TAG'
        BACKEND_ASG_NAME = 'aipost-ec2-backend-asg'

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

        stage('Publish Release Version') {
            steps {
                sh '''
                    aws ssm put-parameter \
                    --name "${IMAGE_TAG_PARAMETER}" \
                    --type String \
                    --value "${IMAGE_TAG}" \
                    --overwrite \
                    --region "${AWS_REGION}"
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

// Adjust Min Healthy Percentage to 50 or 80 during prod
        stage('Deploy to EC2 ASG') {
            steps {
                script {
                    env.INSTANCE_REFRESH_ID = sh(
                        script: '''
                            aws autoscaling start-instance-refresh \
                            --auto-scaling-group-name "${BACKEND_ASG_NAME}" \
                            --region "${AWS_REGION}" \
                            --preferences '{
                                "MinHealthyPercentage": 0, 
                                "InstanceWarmup": 120
                            }' \
                            --query 'InstanceRefreshId' \
                            --output text
                        ''',
                        returnStdout: true
                    ).trim()

                    echo "Instance Refresh ID: ${env.INSTANCE_REFRESH_ID}"
                }
            }
        }

// Polling stage to track deployment progress, does not add anything
        stage('Wait for ASG Deployment') {
            steps {
                sh '''
                    set -e

                    while true; do
                    STATUS=$(aws autoscaling describe-instance-refreshes \
                        --auto-scaling-group-name "${BACKEND_ASG_NAME}" \
                        --instance-refresh-ids "${INSTANCE_REFRESH_ID}" \
                        --region "${AWS_REGION}" \
                        --query 'InstanceRefreshes[0].Status' \
                        --output text)

                    echo "Instance Refresh status: ${STATUS}"

                    case "${STATUS}" in
                        Successful)
                        exit 0
                        ;;

                        Failed|Cancelled|RollbackFailed|RollbackSuccessful)
                        echo "Deployment failed with status: ${STATUS}"
                        exit 1
                        ;;

                        *)
                        sleep 15
                        ;;
                    esac
                    done
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    echo "Checking liveness..."
                    curl --fail \
                    --retry 10 \
                    --retry-delay 10 \
                    https://api.jeblearning.pro.vn/health

                    echo "Checking readiness..."
                    curl --fail \
                    --retry 10 \
                    --retry-delay 10 \
                    https://api.jeblearning.pro.vn/health/ready
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