#!/bin/bash

# ─────────────────────────────────────────────────────────────────
# deploy.sh — Receipt System Infrastructure Deployment
# Deploys all CloudFormation stacks in the correct order.
#
# Usage:
#   ./deploy.sh                → deploy all stacks
#   ./deploy.sh storage        → deploy only the storage stack
#   ./deploy.sh roles          → deploy only the roles stack
#   ./deploy.sh teardown       → DELETE all stacks and resources
# ─────────────────────────────────────────────────────────────────

set -e  # Exit immediately if any command fails

# ── Configuration ─────────────────────────────────────────────────
OWNER="w"
PROJECT="rs"
REGION="us-east-1"
ENV="dev"

# Stack names follow the same naming convention as resources
STACK_STORAGE="${OWNER}-${PROJECT}-${ENV}-stack-storage"
STACK_ROLES="${OWNER}-${PROJECT}-${ENV}-stack-roles"

# ── Color output helpers ───────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}    $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $1"; }

# ── Core deploy function ───────────────────────────────────────────
# Arguments: $1 = stack name, $2 = template file
deploy_stack() {
  local STACK_NAME=$1
  local TEMPLATE=$2

  log_info "Deploying stack: $STACK_NAME"
  log_info "Template:        $TEMPLATE"

  # Check if template file exists
  if [ ! -f "$TEMPLATE" ]; then
    log_error "Template file not found: $TEMPLATE"
    exit 1
  fi

  # aws cloudformation deploy:
  #   --stack-name       → the name CloudFormation uses to track this group of resources
  #   --template-file    → path to the YAML template
  # --parameter-overrides → values for template parameters
  #   --capabilities     → CAPABILITY_NAMED_IAM is required when the template creates IAM resources
  #   --region           → AWS region to deploy into
  #   --no-fail-on-empty-changes → don't error if nothing changed (useful for re-runs)
  aws cloudformation deploy \
    --stack-name "$STACK_NAME" \
    --template-file "$TEMPLATE" \
    --parameter-overrides \
      Owner=$OWNER \
      Project=$PROJECT \
      Environment=$ENV \
    --capabilities CAPABILITY_NAMED_IAM \
    --region "$REGION" \
    --no-fail-on-empty-changes \
    --tags \
      owner=$OWNER \
      project=$PROJECT \
      env=$ENV

  # Verify the stack deployed successfully
  local STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].StackStatus" \
    --output text 2>/dev/null)

  if [[ "$STATUS" == *"COMPLETE"* ]]; then
    log_success "Stack $STACK_NAME deployed → status: $STATUS"
  else
    log_error "Stack $STACK_NAME failed → status: $STATUS"
    log_error "Check CloudFormation console for details"
    exit 1
  fi

  echo ""
}

# ── Print stack outputs ────────────────────────────────────────────
print_outputs() {
  local STACK_NAME=$1
  log_info "Outputs from $STACK_NAME:"
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
    --output table 2>/dev/null || log_warning "No outputs found"
  echo ""
}

# ── Teardown: delete all stacks in reverse order ──────────────────
teardown() {
  log_warning "TEARDOWN MODE — This will delete ALL resources!"
  log_warning "You have 10 seconds to cancel with Ctrl+C..."
  sleep 10

  # Delete in reverse order (dependents first)
  local STACKS=(
    $STACK_ROLES
    $STACK_STORAGE
  )

  for STACK in "${STACKS[@]}"; do
    # Check if stack exists before trying to delete
    local EXISTS=$(aws cloudformation describe-stacks \
      --stack-name "$STACK" \
      --region "$REGION" \
      --query "Stacks[0].StackName" \
      --output text 2>/dev/null || echo "NOTFOUND")

    if [ "$EXISTS" == "NOTFOUND" ]; then
      log_warning "Stack $STACK does not exist — skipping"
      continue
    fi

    log_info "Deleting stack: $STACK"

    # Empty S3 buckets before deleting storage stack
    # (CloudFormation cannot delete a non-empty bucket)
    if [ "$STACK" == "$STACK_STORAGE" ]; then
      log_info "Emptying S3 buckets before stack deletion..."
      aws s3 rm s3://${OWNER}-${PROJECT}-${ENV}-s3-receipts --recursive --region "$REGION" 2>/dev/null || true
      aws s3 rm s3://${OWNER}-${PROJECT}-${ENV}-s3-frontend-hosting --recursive --region "$REGION" 2>/dev/null || true

      # Also delete all versioned objects in the receipts bucket
      log_info "Removing all object versions from receipts bucket..."
      aws s3api list-object-versions \
        --bucket "${OWNER}-${PROJECT}-${ENV}-s3-receipts" \
        --region "$REGION" \
        --query '{Objects: (Versions[] + DeleteMarkers[])[].{Key:Key,VersionId:VersionId}}' \
        --output json 2>/dev/null | \
        aws s3api delete-objects \
          --bucket "${OWNER}-${PROJECT}-${ENV}-s3-receipts" \
          --region "$REGION" \
          --delete file:///dev/stdin 2>/dev/null || true
    fi

    aws cloudformation delete-stack \
      --stack-name "$STACK" \
      --region "$REGION"

    log_info "Waiting for $STACK to be deleted..."
    aws cloudformation wait stack-delete-complete \
      --stack-name "$STACK" \
      --region "$REGION" 2>/dev/null || true

    log_success "Stack $STACK deleted"
    echo ""
  done

  log_success "All stacks deleted. Your AWS account is clean."
}

# ── Main entrypoint ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Receipt System — Infrastructure Deploy"
echo "  Owner: $OWNER | Project: $PROJECT | Env: $ENV | Region: $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Route based on argument
case "${1:-all}" in

  # ── Deploy only the storage stack ─────────────────────────────
  storage)
    deploy_stack "$STACK_STORAGE" "storage.yaml"
    print_outputs "$STACK_STORAGE"
    ;;

  roles)
    deploy_stack "$STACK_ROLES" "permissions.yaml"
    print_outputs "$STACK_ROLES"
    ;;

  # ── Delete everything ─────────────────────────────────────────
  teardown)
    teardown
    ;;

  # ── Deploy all stacks in order ────────────────────────────────
  all)
    log_info "Deploying all stacks in order..."
    echo ""

    deploy_stack "$STACK_STORAGE"      "storage.yaml"
    deploy_stack "$STACK_ROLES"        "permissions.yaml"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "All stacks deployed successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    log_info "Final outputs from all stacks:"
    print_outputs "$STACK_STORAGE"
    ;;

  *)
    log_error "Unknown argument: $1"
    echo "Usage: ./deploy.sh [storage|roles|teardown|all]"
    exit 1
    ;;

esac
