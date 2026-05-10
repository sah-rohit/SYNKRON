#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    // Keywords
    Let,
    Fn,
    If,
    Else,
    While,
    Return,
    Nil,
    True,
    False,

    // Literals
    Ident(String),
    Number(f64),
    String(String),

    // Operators
    Plus,
    Minus,
    Star,
    Slash,
    Assign,
    Equal,
    LessThan,
    GreaterThan,

    // Delimiters
    LParen,
    RParen,
    LBrace,
    RBrace,
    Comma,
    Semicolon,

    // Special
    EOF,
}

pub struct Lexer {
    input: Vec<char>,
    position: usize,
    read_position: usize,
    ch: char,
}

impl Lexer {
    pub fn new(input: &str) -> Self {
        let mut lexer = Lexer {
            input: input.chars().collect(),
            position: 0,
            read_position: 0,
            ch: '\0',
        };
        lexer.read_char();
        lexer
    }

    fn read_char(&mut self) {
        if self.read_position >= self.input.len() {
            self.ch = '\0';
        } else {
            self.ch = self.input[self.read_position];
        }
        self.position = self.read_position;
        self.read_position += 1;
    }

    fn peek_char(&self) -> char {
        if self.read_position >= self.input.len() {
            '\0'
        } else {
            self.input[self.read_position]
        }
    }

    pub fn next_token(&mut self) -> Token {
        self.skip_whitespace();

        let token = match self.ch {
            '=' => {
                if self.peek_char() == '=' {
                    self.read_char();
                    Token::Equal
                } else {
                    Token::Assign
                }
            }
            '+' => Token::Plus,
            '-' => Token::Minus,
            '*' => Token::Star,
            '/' => Token::Slash,
            '<' => Token::LessThan,
            '>' => Token::GreaterThan,
            '(' => Token::LParen,
            ')' => Token::RParen,
            '{' => Token::LBrace,
            '}' => Token::RBrace,
            ',' => Token::Comma,
            ';' => Token::Semicolon,
            '"' => {
                let s = self.read_string();
                Token::String(s)
            }
            '\0' => Token::EOF,
            _ => {
                if self.is_letter() {
                    let ident = self.read_identifier();
                    return match ident.as_str() {
                        "let" => Token::Let,
                        "fn" => Token::Fn,
                        "if" => Token::If,
                        "else" => Token::Else,
                        "while" => Token::While,
                        "return" => Token::Return,
                        "nil" => Token::Nil,
                        "true" => Token::True,
                        "false" => Token::False,
                        _ => Token::Ident(ident),
                    };
                } else if self.is_digit() {
                    let num = self.read_number();
                    return Token::Number(num);
                } else {
                    // Skip unknown characters
                    self.read_char();
                    return self.next_token();
                }
            }
        };

        self.read_char();
        token
    }

    fn read_identifier(&mut self) -> String {
        let position = self.position;
        while self.is_letter() || self.is_digit() {
            self.read_char();
        }
        self.input[position..self.position].iter().collect()
    }

    fn read_number(&mut self) -> f64 {
        let position = self.position;
        while self.is_digit() || self.ch == '.' {
            self.read_char();
        }
        let s: String = self.input[position..self.position].iter().collect();
        s.parse().unwrap_or(0.0)
    }

    fn read_string(&mut self) -> String {
        self.read_char(); // skip opening quote
        let position = self.position;
        while self.ch != '"' && self.ch != '\0' {
            self.read_char();
        }
        let s = self.input[position..self.position].iter().collect();
        self.read_char(); // skip closing quote
        s
    }

    fn skip_whitespace(&mut self) {
        while self.ch == ' ' || self.ch == '\t' || self.ch == '\n' || self.ch == '\r' {
            self.read_char();
        }
    }

    fn is_letter(&self) -> bool {
        self.ch.is_alphabetic() || self.ch == '_'
    }

    fn is_digit(&self) -> bool {
        self.ch.is_numeric()
    }
}
