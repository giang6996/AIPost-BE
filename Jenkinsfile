pipeline {
    agent any

    environment {
        AWS_REGION = "ap-southeast-1"

        BACKEND_ASG_NAME = 'aipost-ec2-backend-asg'
        IMAGE_TAG_PARAMETER = '/aipost/ec2/backend/IMAGE_TAG'
        DATABASE_URL_PARAMETER ='/aipost/ec2/backend/DATABASE_URL'

        ECR_REGISTRY = "596261186564.dkr.ecr.ap-southeast-1.amazonaws.com"
        ECR_REPOSITORY = "aipost-ec2-backend"

        // For db testing
        TEST_DATABASE_URL = "postgresql://aipost_test:aipost_test_password@127.0.0.1:5433/aipost_test"
        TEST_ENCRYPTION_KEY = "123456789012345678901234567890123456789012345678901234567890"
        TEST_CORS_ORIGINS="http://localhost:5173"
        TEST_MEDIA_STORAGE_PROVIDER="local"
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

                '''
            }
        }

        stage('Generate Prisma Client') {
            steps {
                withEnv([
                    "DATABASE_URL=${TEST_DATABASE_URL}",
                    "ENCRYPTION_KEY=${TEST_ENCRYPTION_KEY}",
                    "CORS_ORIGINSL=${TEST_CORS_ORIGINS}",
                    "MEDIA_STORAGE_PROVIDER=${TEST_MEDIA_STORAGE_PROVIDER}"
                ]) {
                    sh 'npx prisma generate'
                }
            }
        }

        stage('Prepare Test Database') {
            steps {
                withEnv([
                    "DATABASE_URL=${TEST_DATABASE_URL}"
                    "ENCRYPTION_KEY=${TEST_ENCRYPTION_KEY}"
                    "CORS_ORIGINSL=${TEST_CORS_ORIGINS}"
                    "MEDIA_STORAGE_PROVIDER=${TEST_MEDIA_STORAGE_PROVIDER}"
                ]) {
                    sh '''
                        npx prisma migrate deploy
                        npx prisma migrate status
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                withEnv([
                    "DATABASE_URL=${TEST_DATABASE_URL}"
                    "ENCRYPTION_KEY=${TEST_ENCRYPTION_KEY}"
                    "CORS_ORIGINSL=${TEST_CORS_ORIGINS}"
                    "MEDIA_STORAGE_PROVIDER=${TEST_MEDIA_STORAGE_PROVIDER}"
                ]) {
                    sh 'npm test'
                }
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

                    env.RUNTIME_IMAGE_URI =
                        "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}"

                    env.MIGRATION_IMAGE_TAG =
                        "migration-${env.IMAGE_TAG}"

                    env.MIGRATION_IMAGE_URI =
                        "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.MIGRATION_IMAGE_TAG}"

                    echo "Docker Runtime image tag: ${env.IMAGE_TAG}"
                    echo "Docker Runtime image URI: ${env.RUNTIME_IMAGE_URI}"
                    echo "Docker Migration image tag: ${env.MIGRATION_IMAGE_TAG}"
                    echo "Docker Migration image URI: ${env.MIGRATION_IMAGE_URI}"
                }
            }
        }


        stage('Docker Build') {
            steps {
                sh '''
                    docker build \
                      --target runtime \
                      -t "${RUNTIME_IMAGE_URI}" \
                      .

                    docker build \
                      --target migration \
                      -t "${MIGRATION_IMAGE_URI}" \
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
                    docker push "${RUNTIME_IMAGE_URI}"
                    docker push "${MIGRATION_IMAGE_URI}"

                    docker tag \
                      "${RUNTIME_IMAGE_URI}" \
                      "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"

                    docker push \
                      "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
                '''
            }
        }

        stage('Migrate Production Database') {
            steps {
                script {
                    def databaseUrl = sh(
                        script: '''
                            aws ssm get-parameter \
                            --name "${DATABASE_URL_PARAMETER}" \
                            --with-decryption \
                            --region "${AWS_REGION}" \
                            --query 'Parameter.Value' \
                            --output text
                        ''',
                        returnStdout: true
                    ).trim()

                    withEnv(["DATABASE_URL=${databaseUrl}"]) {
                        sh '''
                            docker run --rm \
                            -e DATABASE_URL \
                            "${MIGRATION_IMAGE_URI}"
                        '''
                    }
                }
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
        // Check current ASG capacity, if = 0 skip deploying and refresh polling stage
        stage('Check ASG Capacity') {
            steps {
                script {
                    env.ASG_DESIRED_CAPACITY = sh(
                        script: '''
                            aws autoscaling describe-auto-scaling-groups \
                              --auto-scaling-group-names "${BACKEND_ASG_NAME}" \
                              --region "${AWS_REGION}" \
                              --query 'AutoScalingGroups[0].DesiredCapacity' \
                              --output text
                        ''',
                        returnStdout: true
                    ).trim()

                    echo "ASG desired capacity: ${env.ASG_DESIRED_CAPACITY}"
                }
            }
        }

        // Adjust Min Healthy Percentage to 50 or 80 during prod
        stage('Deploy to EC2 ASG') {
            when {
                expression {
                    env.ASG_DESIRED_CAPACITY != '0'
                }
            }

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
            when {
                expression {
                    env.ASG_DESIRED_CAPACITY != '0'
                }
            }

            options {
                timeout(time: 15, unit: 'MINUTES')
            }

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

                      PERCENTAGE=$(aws autoscaling describe-instance-refreshes \
                        --auto-scaling-group-name "${BACKEND_ASG_NAME}" \
                        --instance-refresh-ids "${INSTANCE_REFRESH_ID}" \
                        --region "${AWS_REGION}" \
                        --query 'InstanceRefreshes[0].PercentageComplete' \
                        --output text)

                      INSTANCES_LEFT=$(aws autoscaling describe-instance-refreshes \
                        --auto-scaling-group-name "${BACKEND_ASG_NAME}" \
                        --instance-refresh-ids "${INSTANCE_REFRESH_ID}" \
                        --region "${AWS_REGION}" \
                        --query 'InstanceRefreshes[0].InstancesToUpdate' \
                        --output text)

                      REASON=$(aws autoscaling describe-instance-refreshes \
                        --auto-scaling-group-name "${BACKEND_ASG_NAME}" \
                        --instance-refresh-ids "${INSTANCE_REFRESH_ID}" \
                        --region "${AWS_REGION}" \
                        --query 'InstanceRefreshes[0].StatusReason' \
                        --output text)

                        echo "Instance Refresh ID: ${INSTANCE_REFRESH_ID}"
                        echo "Status: ${STATUS}"
                        echo "Progress: ${PERCENTAGE}%"
                        echo "Instances remaining: ${INSTANCES_LEFT}"
                        echo "Reason: ${STATUS_REASON}"
                        echo ""

                        case "${STATUS}" in
                            Successful)
                                exit 0
                                ;;

                            Failed|Cancelled|RollbackFailed)
                                echo "Deployment failed: ${STATUS}"
                                exit 1
                                ;;

                            RollbackSuccessful)
                                echo "Deployment was rolled back."
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
            options {
                timeout(time: 5, unit: 'MINUTES')
            }

            steps {
                sh '''
                    set -e

                    echo "Checking backend liveness..."

                    curl --fail \
                    --silent \
                    --show-error \
                    --retry 10 \
                    --retry-delay 10 \
                    https://api.jeblearning.pro.vn/health

                    echo ""
                    echo "Checking backend readiness..."

                    curl --fail \
                    --silent \
                    --show-error \
                    --retry 10 \
                    --retry-delay 10 \
                    https://api.jeblearning.pro.vn/health/ready

                    echo ""
                    echo "Backend deployment verified."
                '''
            }
        }
    }

    post {
        always {
            sh 'docker rm -f aipost-test-db || true'
        }

        success {
            sh '''
                docker image rm "${RUNTIME_IMAGE_URI}" || true
                docker image rm "${MIGRATION_IMAGE_URI}" || true
                docker image rm \
                  "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest" || true
            '''

            echo 'AIPost backend CI/CD completed successfully.'
        }

        failure {
            echo 'AIPost backend CI failed.'
        }
    }
}