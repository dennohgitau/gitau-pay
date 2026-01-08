pipeline {
    agent any
    
    environment {
        NODEJS_VERSION = '18'
        PROJECT_DIR = '/home/ubuntu/pesapal-aws'
        PYTHON_VERSION = 'python3'
    }
    
    tools {
        nodejs 'NodeJS-18'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh '''
                                echo "Setting up Python virtual environment..."
                                python3 -m venv venv || true
                                source venv/bin/activate
                                pip install --upgrade pip
                                pip install -r requirements.txt
                            '''
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "Installing Node.js dependencies..."
                                npm install
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Backend Lint') {
                    steps {
                        dir('backend') {
                            sh '''
                                source venv/bin/activate
                                pip install pylint flake8 || true
                                echo "Running pylint..."
                                pylint main.py --disable=C0111 || true
                                echo "Running flake8..."
                                flake8 main.py --max-line-length=120 || true
                            '''
                        }
                    }
                }
                stage('Frontend Build Check') {
                    steps {
                        dir('frontend') {
                            sh '''
                                echo "Checking frontend build..."
                                npm run build || echo "Build check completed"
                            '''
                        }
                    }
                }
            }
        }
        
        stage('SonarQube Analysis') {
            when {
                expression { env.SONAR_TOKEN != null }
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        echo "Running SonarQube analysis..."
                        sonar-scanner \
                            -Dsonar.projectKey=gitau-pay \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=http://localhost:9000 \
                            -Dsonar.login=${SONAR_TOKEN} \
                            -Dsonar.exclusions=**/node_modules/**,**/venv/**,**/dist/**,**/__pycache__/**
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                dir('frontend') {
                    sh '''
                        echo "Building frontend for production..."
                        npm run build
                    '''
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    echo "Deploying application..."
                    cd ${PROJECT_DIR}
                    
                    # Restart backend with PM2
                    pm2 restart gitau-pay-backend || pm2 start ecosystem.config.js
                    
                    # Reload Nginx
                    sudo systemctl reload nginx
                    
                    echo "Deployment completed!"
                '''
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline succeeded!'
            // Add notifications here (email, Slack, etc.)
        }
        failure {
            echo 'Pipeline failed!'
            // Add failure notifications here
        }
        always {
            echo 'Cleaning up...'
            cleanWs()
        }
    }
}
