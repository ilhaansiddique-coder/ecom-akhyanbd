<?php

namespace App\Filament\Pages;

use App\Models\SiteSetting;
use Filament\Actions\Action;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class SiteSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static ?string $navigationLabel = 'সাইট সেটিংস';
    protected static string | \UnitEnum | null $navigationGroup = 'সেটিংস';

    protected static ?string $title = 'সাইট সেটিংস';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'site_name'        => SiteSetting::get('site_name', ''),
            'phone'            => SiteSetting::get('phone', ''),
            'email'            => SiteSetting::get('email', ''),
            'address'          => SiteSetting::get('address', ''),
            'facebook'         => SiteSetting::get('facebook', ''),
            'instagram'        => SiteSetting::get('instagram', ''),
            'youtube'          => SiteSetting::get('youtube', ''),
            'whatsapp'         => SiteSetting::get('whatsapp', ''),
            'meta_title'       => SiteSetting::get('meta_title', ''),
            'meta_description' => SiteSetting::get('meta_description', ''),
            'logo'             => SiteSetting::get('logo', ''),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('সাধারণ তথ্য')
                    ->schema([
                        TextInput::make('site_name')->label('সাইটের নাম'),
                        TextInput::make('phone')->label('ফোন'),
                        TextInput::make('email')->label('ইমেইল'),
                        TextInput::make('address')->label('ঠিকানা'),
                    ])->columns(2),

                Section::make('সোশ্যাল মিডিয়া')
                    ->schema([
                        TextInput::make('facebook')->label('ফেসবুক')->url(),
                        TextInput::make('instagram')->label('ইনস্টাগ্রাম')->url(),
                        TextInput::make('youtube')->label('ইউটিউব')->url(),
                        TextInput::make('whatsapp')->label('হোয়াটসঅ্যাপ'),
                    ])->columns(2),

                Section::make('এসইও')
                    ->schema([
                        TextInput::make('meta_title')->label('মেটা টাইটেল'),
                        Textarea::make('meta_description')->label('মেটা ডেসক্রিপশন'),
                    ]),

                Section::make('লোগো')
                    ->schema([
                        FileUpload::make('logo')->directory('settings')->image()->label('সাইট লোগো'),
                    ]),
            ])
            ->statePath('data');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('save')
                ->label('সংরক্ষণ করুন')
                ->action('save'),
        ];
    }

    public function save(): void
    {
        $data = $this->form->getState();

        foreach ($data as $key => $value) {
            SiteSetting::set($key, $value);
        }

        Notification::make()
            ->title('সেটিংস সংরক্ষিত হয়েছে!')
            ->success()
            ->send();
    }

    protected static ?string $slug = 'site-settings';
}
