CREATE TABLE auto_managed_positions (
    token_id INTEGER PRIMARY KEY,
    user_address TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    strategy_parameters JSONB,
    nft_approved_to_operator BOOLEAN NOT NULL DEFAULT FALSE,
    token0_address TEXT,
    token1_address TEXT,
    token0_approved_for_swap BOOLEAN NOT NULL DEFAULT FALSE,
    token1_approved_for_swap BOOLEAN NOT NULL DEFAULT FALSE,
    token0_approved_for_mint BOOLEAN NOT NULL DEFAULT FALSE,
    token1_approved_for_mint BOOLEAN NOT NULL DEFAULT FALSE,
    last_checked_at TIMESTAMP,
    status_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    initial_amount0_wei NUMERIC,
    initial_amount1_wei NUMERIC,
    cumulative_fees_token0_wei NUMERIC,
    cumulative_fees_token1_wei NUMERIC
);