<?php
declare(strict_types=1);

namespace App\Demo;

use DateTime;

class Greeter {
    public function hello(string $name): string {
        echo "Hello, $name";
        return "Hello, $name";
    }
}

function add($a, $b) { return $a + $b; }

$g = new Greeter();
$g->hello('World');
echo add(2, 3);

