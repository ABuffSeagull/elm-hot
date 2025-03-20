module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes as Attr
import Html.Events as Ev


main =
    Browser.sandbox
        { init = init
        , update = update
        , view = view
        }


init =
    0


type Msg
    = Increment


update msg model =
    model + 1


view model =
    button [ Attr.type_ "button", Ev.onClick Increment ] [ text "Count: ", model |> String.fromInt |> text ]
