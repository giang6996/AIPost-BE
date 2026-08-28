pipeline {
    agent any

    parameters {
        choice(
            name: 'DEPLOY_TARGET',
            choices: ['eks', 'ec2'],
            description: 'Active backend deployment target'
        )
    }

    environment {

        AWS_REGION = "ap-southeast-1"

        ENVIRONMENT_BOOTSTRAP_PARAMETER = "/aipost-bootstrap/active"

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

        stage('Load Deployment Config') {
            steps {
                script {
                    env.DEPLOY_TARGET = params.DEPLOY_TARGET

                    env.SSM_PARAMETER_PREFIX = sh(
                        script: """
                            aws ssm get-parameter \
                            --name "${ENVIRONMENT_BOOTSTRAP_PARAMETER}" \
                            --region "${AWS_REGION}" \
                            --query 'Parameter.Value' \
                            --output text
                        """,
                        returnStdout: true
                    ).trim()

                    env.DATABASE_URL_PARAMETER = "${env.SSM_PARAMETER_PREFIX}/backend/DATABASE_URL"

                    if (env.DEPLOY_TARGET == 'ec2') {
                        env.IMAGE_TAG_PARAMETER = "${env.SSM_PARAMETER_PREFIX}/backend/IMAGE_TAG"                  

                        env.BACKEND_ASG_NAME = sh(
                            script: """
                                aws ssm get-parameter \
                                --name "${env.SSM_PARAMETER_PREFIX}/backend/BACKEND_ASG_NAME" \
                                --region "${AWS_REGION}" \
                                --query 'Parameter.Value' \
                                --output text
                            """,
                            returnStdout: true
                        ).trim()
                    }

                    if (env.DEPLOY_TARGET == 'eks') {
                        env.EKS_CLUSTER_NAME = sh(
                            script: """
                                aws ssm get-parameter \
                                --name "${env.SSM_PARAMETER_PREFIX}/infrastructure/EKS_CLUSTER_NAME" \
                                --region "${AWS_REGION}" \
                                --query 'Parameter.Value' \
                                --output text
                            """,
                            returnStdout: true
                        ).trim()

                        env.K8S_NAMESPACE = "aipost"
                        env.K8S_DEPLOYMENT = "aipost-backend"
                        env.K8S_CONTAINER = "backend"
                    }

                    env.ECR_REPOSITORY_URL = sh(
                        script: """
                            aws ssm get-parameter \
                            --name "${env.SSM_PARAMETER_PREFIX}/backend/ECR_REPOSITORY_URL" \
                            --region "${AWS_REGION}" \
                            --query 'Parameter.Value' \
                            --output text
                        """,
                        returnStdout: true
                    ).trim()

                    env.BACKEND_API_URL = sh(
                        script: """
                            aws ssm get-parameter \
                            --name "${env.SSM_PARAMETER_PREFIX}/backend/API_URL" \
                            --region "${AWS_REGION}" \
                            --query 'Parameter.Value' \
                            --output text
                        """,
                        returnStdout: true
                    ).trim()
                }
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
                    "CORS_ORIGINS=${TEST_CORS_ORIGINS}",
                    "MEDIA_STORAGE_PROVIDER=${TEST_MEDIA_STORAGE_PROVIDER}"
                ]) {
                    sh 'npx prisma generate'
                }
            }
        }

        stage('Prepare Test Database') {
            steps {
                withEnv([
                    "DATABASE_URL=${TEST_DATABASE_URL}",
                    "ENCRYPTION_KEY=${TEST_ENCRYPTION_KEY}",
                    "CORS_ORIGINS=${TEST_CORS_ORIGINS}",
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
                    "DATABASE_URL=${TEST_DATABASE_URL}",
                    "ENCRYPTION_KEY=${TEST_ENCRYPTION_KEY}",
                    "CORS_ORIGINS=${TEST_CORS_ORIGINS}",
                    "MEDIA_STORAGE_PROVIDER=${TEST_MEDIA_STORAGE_PROVIDER}"
                ]) {
                    sh 'npm test'
                }
            }
        }


        stage('Build') {
            steps {
                withEnv([
                    "DATABASE_URL=${TEST_DATABASE_URL}",
                    "ENCRYPTION_KEY=${TEST_ENCRYPTION_KEY}",
                    "CORS_ORIGINS=${TEST_CORS_ORIGINS}",
                    "MEDIA_STORAGE_PROVIDER=${TEST_MEDIA_STORAGE_PROVIDER}"
                ]) {
                    sh 'npm run build'
                }
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
                        "${env.ECR_REPOSITORY_URL}:${env.IMAGE_TAG}"

                    env.MIGRATION_IMAGE_TAG =
                        "migration-${env.IMAGE_TAG}"

                    env.MIGRATION_IMAGE_URI =
                        "${env.ECR_REPOSITORY_URL}:${env.MIGRATION_IMAGE_TAG}"

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
                    --password-stdin ${ECR_REPOSITORY_URL}
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
                      "${ECR_REPOSITORY_URL}:latest"

                    docker push \
                      "${ECR_REPOSITORY_URL}:latest"
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

        stage('Seed Production Database') {
            steps {
                sh '''
                    set -e

                    DATABASE_URL=$(aws ssm get-parameter \
                    --name "${DATABASE_URL_PARAMETER}" \
                    --with-decryption \
                    --region "${AWS_REGION}" \
                    --query 'Parameter.Value' \
                    --output text)

                    docker run --rm \
                    -e DATABASE_URL="${DATABASE_URL}" \
                    "${MIGRATION_IMAGE_URI}" \
                    npx prisma db seed
                '''
            }
        }

        stage('Publish Release Version') {
            when {
                expression {
                    env.DEPLOY_TARGET == 'ec2'
                }
            }

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
                    docker image rm "${RUNTIME_IMAGE_URI}" || true
                    docker image rm "${MIGRATION_IMAGE_URI}" || true
                    docker image rm ${ECR_REPOSITORY_URL}:latest || true
                '''
            }
        }
        // Check current ASG capacity, if = 0 skip deploying and refresh polling stage
        stage('Check ASG Capacity') {
            when {
                expression {
                    env.DEPLOY_TARGET == 'ec2'
                }
            }

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
                    env.ASG_DESIRED_CAPACITY != '0' &&
                    env.DEPLOY_TARGET == 'ec2'
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
                    env.ASG_DESIRED_CAPACITY != '0' &&
                    env.DEPLOY_TARGET == 'ec2'
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
                        echo "Reason: ${REASON}"
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

        stage('Configure EKS Access') {
            when {
                expression {
                    env.DEPLOY_TARGET == 'eks'
                }
            }

            steps {
                sh '''
                    set -e

                    aws eks update-kubeconfig \
                    --name "${EKS_CLUSTER_NAME}" \
                    --region "${AWS_REGION}"

                    kubectl get deployment \
                    "${K8S_DEPLOYMENT}" \
                    -n "${K8S_NAMESPACE}"
                '''
            }
        }

        stage('Deploy to EKS') {
            when {
                expression {
                    env.DEPLOY_TARGET == 'eks'
                }
            }

            options {
                timeout(time: 5, unit: 'MINUTES')
            }

            steps {
                sh '''
                    set -e

                    echo "Deploying ${RUNTIME_IMAGE_URI} to EKS..."

                    kubectl set image \
                    deployment/"${K8S_DEPLOYMENT}" \
                    "${K8S_CONTAINER}"="${RUNTIME_IMAGE_URI}" \
                    -n "${K8S_NAMESPACE}"

                    kubectl rollout status \
                    deployment/"${K8S_DEPLOYMENT}" \
                    -n "${K8S_NAMESPACE}" \
                    --timeout=180s
                '''
            }
        }

        stage('Verify Deployment') {
            when {
                expression {
                    env.DEPLOY_TARGET == 'eks' ||
                    (
                        env.DEPLOY_TARGET == 'ec2' &&
                        env.ASG_DESIRED_CAPACITY != '0'
                    )
                }
            }

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
                    "${BACKEND_API_URL}/health"

                    echo ""
                    echo "Checking backend readiness..."

                    curl --fail \
                    --silent \
                    --show-error \
                    --retry 10 \
                    --retry-delay 10 \
                    "${BACKEND_API_URL}/health/ready"

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
                  "${ECR_REPOSITORY_URL}:latest" || true
            '''

            echo 'AIPost backend CI/CD completed successfully.'
        }

        failure {
            echo 'AIPost backend CI failed.'
        }
    }
}