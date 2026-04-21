<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $token) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'আপনার পাসওয়ার্ড রিসেট কোড — মা ভেষজ বাণিজ্যালয়',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.reset-code',
        );
    }
}
