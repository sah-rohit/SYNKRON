use crate::lexer::{Lexer, Token};

#[derive(Debug, Clone, PartialEq)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Lt,
    Gt,
    Eq,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Literal(LiteralValue),
    Variable(String),
    Binary(BinOp, Box<Expr>, Box<Expr>),
    Call(String, Vec<Expr>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum LiteralValue {
    Nil,
    Boolean(bool),
    Number(f64),
    String(String),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Stmt {
    Let(String, Expr),
    Assign(String, Expr),
    If(Expr, Vec<Stmt>, Option<Vec<Stmt>>),
    While(Expr, Vec<Stmt>),
    Return(Option<Expr>),
    ExprStmt(Expr),
    Fn(String, Vec<String>, Vec<Stmt>),
}

pub struct Parser {
    lexer: Lexer,
    cur_token: Token,
    peek_token: Token,
}

impl Parser {
    pub fn new(mut lexer: Lexer) -> Self {
        let cur_token = lexer.next_token();
        let peek_token = lexer.next_token();
        Parser {
            lexer,
            cur_token,
            peek_token,
        }
    }

    fn next_token(&mut self) {
        self.cur_token = self.peek_token.clone();
        self.peek_token = self.lexer.next_token();
    }

    pub fn parse_program(&mut self) -> Vec<Stmt> {
        let mut statements = Vec::new();
        while self.cur_token != Token::EOF {
            if let Some(stmt) = self.parse_statement() {
                statements.push(stmt);
            }
            self.next_token();
        }
        statements
    }

    fn parse_statement(&mut self) -> Option<Stmt> {
        match &self.cur_token {
            Token::Let => self.parse_let_statement(),
            Token::Fn => self.parse_fn_statement(),
            Token::If => self.parse_if_statement(),
            Token::While => self.parse_while_statement(),
            Token::Return => self.parse_return_statement(),
            Token::Ident(_) if self.peek_token == Token::Assign => self.parse_assign_statement(),
            _ => self.parse_expr_statement(),
        }
    }

    fn parse_let_statement(&mut self) -> Option<Stmt> {
        self.next_token(); // skip 'let'
        let name = match &self.cur_token {
            Token::Ident(s) => s.clone(),
            _ => return None,
        };

        self.next_token(); // skip ident
        if self.cur_token != Token::Assign {
            return None;
        }

        self.next_token(); // skip '='
        let expr = self.parse_expression(0)?;

        if self.peek_token == Token::Semicolon {
            self.next_token();
        }

        Some(Stmt::Let(name, expr))
    }

    fn parse_assign_statement(&mut self) -> Option<Stmt> {
        let name = match &self.cur_token {
            Token::Ident(s) => s.clone(),
            _ => return None,
        };

        self.next_token(); // skip ident
        self.next_token(); // skip '='
        let expr = self.parse_expression(0)?;

        if self.peek_token == Token::Semicolon {
            self.next_token();
        }

        Some(Stmt::Assign(name, expr))
    }

    fn parse_fn_statement(&mut self) -> Option<Stmt> {
        self.next_token(); // skip 'fn'
        let name = match &self.cur_token {
            Token::Ident(s) => s.clone(),
            _ => return None,
        };

        self.next_token(); // skip ident
        if self.cur_token != Token::LParen {
            return None;
        }

        let mut params = Vec::new();
        if self.peek_token != Token::RParen {
            self.next_token(); // move to first param
            if let Token::Ident(s) = &self.cur_token {
                params.push(s.clone());
            }
            while self.peek_token == Token::Comma {
                self.next_token(); // move to comma
                self.next_token(); // move to param
                if let Token::Ident(s) = &self.cur_token {
                    params.push(s.clone());
                }
            }
        }
        self.next_token(); // move to RParen
        if self.cur_token != Token::RParen {
            return None;
        }

        self.next_token(); // move to LBrace
        if self.cur_token != Token::LBrace {
            return None;
        }

        let body = self.parse_block_statement();
        Some(Stmt::Fn(name, params, body))
    }

    fn parse_block_statement(&mut self) -> Vec<Stmt> {
        let mut statements = Vec::new();
        self.next_token(); // skip '{'
        while self.cur_token != Token::RBrace && self.cur_token != Token::EOF {
            if let Some(stmt) = self.parse_statement() {
                statements.push(stmt);
            }
            self.next_token();
        }
        statements
    }

    fn parse_if_statement(&mut self) -> Option<Stmt> {
        self.next_token(); // skip 'if'
        let cond = self.parse_expression(0)?;

        self.next_token(); // move to '{'
        if self.cur_token != Token::LBrace {
            return None;
        }

        let then_branch = self.parse_block_statement();
        let mut else_branch = None;

        if self.peek_token == Token::Else {
            self.next_token(); // skip '}'
            self.next_token(); // skip 'else'
            if self.cur_token == Token::LBrace {
                else_branch = Some(self.parse_block_statement());
            }
        }

        Some(Stmt::If(cond, then_branch, else_branch))
    }

    fn parse_while_statement(&mut self) -> Option<Stmt> {
        self.next_token(); // skip 'while'
        let cond = self.parse_expression(0)?;

        self.next_token(); // move to '{'
        if self.cur_token != Token::LBrace {
            return None;
        }

        let body = self.parse_block_statement();
        Some(Stmt::While(cond, body))
    }

    fn parse_return_statement(&mut self) -> Option<Stmt> {
        self.next_token(); // skip 'return'
        let mut expr = None;
        if self.cur_token != Token::Semicolon && self.cur_token != Token::RBrace {
            expr = self.parse_expression(0);
        }

        if self.peek_token == Token::Semicolon {
            self.next_token();
        }

        Some(Stmt::Return(expr))
    }

    fn parse_expr_statement(&mut self) -> Option<Stmt> {
        let expr = self.parse_expression(0)?;
        if self.peek_token == Token::Semicolon {
            self.next_token();
        }
        Some(Stmt::ExprStmt(expr))
    }

    fn parse_expression(&mut self, precedence: u8) -> Option<Expr> {
        let mut left = self.parse_prefix()?;

        while self.peek_token != Token::Semicolon && precedence < self.peek_precedence() {
            self.next_token();
            left = self.parse_infix(left)?;
        }

        Some(left)
    }

    fn parse_prefix(&mut self) -> Option<Expr> {
        match &self.cur_token {
            Token::Ident(s) => {
                if self.peek_token == Token::LParen {
                    let name = s.clone();
                    self.next_token(); // move to '('
                    let mut args = Vec::new();
                    if self.peek_token != Token::RParen {
                        self.next_token();
                        args.push(self.parse_expression(0)?);
                        while self.peek_token == Token::Comma {
                            self.next_token();
                            self.next_token();
                            args.push(self.parse_expression(0)?);
                        }
                    }
                    self.next_token(); // move to ')'
                    Some(Expr::Call(name, args))
                } else {
                    Some(Expr::Variable(s.clone()))
                }
            }
            Token::Number(n) => Some(Expr::Literal(LiteralValue::Number(*n))),
            Token::String(s) => Some(Expr::Literal(LiteralValue::String(s.clone()))),
            Token::True => Some(Expr::Literal(LiteralValue::Boolean(true))),
            Token::False => Some(Expr::Literal(LiteralValue::Boolean(false))),
            Token::Nil => Some(Expr::Literal(LiteralValue::Nil)),
            Token::LParen => {
                self.next_token();
                let expr = self.parse_expression(0)?;
                self.next_token(); // skip ')'
                Some(expr)
            }
            _ => None,
        }
    }

    fn parse_infix(&mut self, left: Expr) -> Option<Expr> {
        let op = match &self.cur_token {
            Token::Plus => BinOp::Add,
            Token::Minus => BinOp::Sub,
            Token::Star => BinOp::Mul,
            Token::Slash => BinOp::Div,
            Token::LessThan => BinOp::Lt,
            Token::GreaterThan => BinOp::Gt,
            Token::Equal => BinOp::Eq,
            _ => return Some(left),
        };

        let precedence = self.cur_precedence();
        self.next_token();
        let right = self.parse_expression(precedence)?;
        Some(Expr::Binary(op, Box::new(left), Box::new(right)))
    }

    fn cur_precedence(&self) -> u8 {
        match self.cur_token {
            Token::Equal => 1,
            Token::LessThan | Token::GreaterThan => 2,
            Token::Plus | Token::Minus => 3,
            Token::Star | Token::Slash => 4,
            _ => 0,
        }
    }

    fn peek_precedence(&self) -> u8 {
        match self.peek_token {
            Token::Equal => 1,
            Token::LessThan | Token::GreaterThan => 2,
            Token::Plus | Token::Minus => 3,
            Token::Star | Token::Slash => 4,
            _ => 0,
        }
    }
}
