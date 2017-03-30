$(function(){

  var userInput = "";

  // Create a model for the services
    var Food = Backbone.Model.extend({

        // Default attributes for the tracker item
        defaults: function() {
            return {
                img: "not-found.png",
                food: "",
                qty: "",
                calories: "/food-backbone",
              };
        },
        url: ""

    });

    var OptionItem =  Backbone.Model.extend({
        defaults: function() {
            return {
                name: "",
                img: "not-found.png",
                food: "",
                qty: "",
                calories: ""
            };
        }
    });

    var FoodList = Backbone.Collection.extend({
        model: Food,
        localStorage: new Backbone.LocalStorage("food-backbone"),
    });

    var OptionList = Backbone.Collection.extend({
        model: OptionItem,
    });

    var Foods = new FoodList;
    var Options = new OptionList;

    var FoodView = Backbone.View.extend({
        tagName: "tr",
        className: function() {
            if (this.model.get("newlyAdded")) {
                return "colorChanged food"
            }
            return "food"
        },
        template: _.template($('#item-template').html()),
        events: {
          "click .destroy" : "clear",
          "click .thumb" : "zoom",
        },

       // Set a direct reference on the model
        initialize: function() {
            this.listenTo(this.model, 'destroy', this.remove);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            return this;
        },

        clear: function(e) {
            var currentTarget = $(e.currentTarget);
            currentTarget.parents('tr').removeClass("colorChanged").addClass("removedItem");
            var self = this;

            var timer = window.setTimeout( function() {
                self.model.destroy();
            }, 500);
        },
        zoom: function(e) {
          var img = this.model.get("img");
          $(".zoom").attr({src: img});
          $('#overlay, #overlay-back').fadeIn(500);

          $("#overlay, #overlay-back").click(function() {
              $("#overlay, #overlay-back").hide();
          });
        }

    });

    var OptionView =  Backbone.View.extend({
        tagName: "li",
        template: _.template($('#listTemplate').html()),
        events: {
          "click .option": function(e) {
            this.addFood();
            this.hideOptions(e);
          }
        },
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));

            // Hide resultList when click outside of it
            $(window).click(function() {
                $("#resultList").slideUp();
            });

            $('#resultList').click(function(event){
                event.stopPropagation();
            });
            return this;
        },
        addFood: function() {
            var img = this.model.get("img");
            var food = this.model.get("food");
            var qty = this.model.get("qty");
            var calories = this.model.get("calories");

            Foods.add({img: img, food: food, qty: qty, calories: calories, newlyAdded: true});

            this.$("#resultList").html("");

            $("#resultList").slideUp();

            this.$("#resultList").html("{img: img, name: food, food: food, qty: qty, calories: calories}");


            return false;
        },

        hideOptions: function(e) {
          var currentTarget = $(e.currentTarget);
          $("#resultListCopy").show();
          var food = this.model.get("food");
          var element = $("#foodList tr:last");
          var start = $(e.currentTarget).offset();
          var end;
          if (element.length) {
              end = $("#foodList tr:last").offset()
          } else {
              end = {top: 152, left:250}
          };

          $("#listCopy").css({"top": start.top, "left": "-" + start.left, "opacity": 1})

          $("#resultListCopy li").text(food)

          $("#listCopy").animate({
            "top": end.top + 5,
            "left": -end.left - 108,
          });

          var timer = window.setTimeout( function() {
              this.$("#resultListCopy").hide();
              $("#listCopy").animate({
                "top": "0",
                "left": "0",
                "opacity": 0
              })
          }, 560);
        }

    });

    var AppView = Backbone.View.extend({
        el: $("#trackerapp"),
        events: {
            "click #addNew": "createOnClick",
            // Empty html before load new options
            "click #search": function(e) {
              this.populateOptions(e);
              this.emptyOptions(e);
            },

            "click #clear": "reset"
        },
        initialize: function() {
            this.input = this.$("#new-food");
            this.totalCal = 0;

            this.listenTo(Foods, "add", this.addOne);
            this.listenTo(Foods, "add", this.addCal);
            this.listenTo(Foods, "destroy", this.subCal);
            this.listenTo(Options, "add", this.addOption);
            // this.listenTo(Options, "destroy", this.addAll);

            this.updateData();
            // this.listenTo(Foods, 'all', this.render);
            Foods.fetch();

        },
        render: function() {

        },
        reset: function() {
          // Clear all data
          _.each(_.clone(Foods.models), function(model) {
              model.destroy();
          });
        },
        emptyOptions: function() {
            this.$("#resultList").html("");
            return false;
        },
        addOne: function(food) {

          var view = new FoodView({model: food});

          food.unset("newlyAdded");
          food.save();
          window.setTimeout( function() {
              this.$("#foodList").append(view.render().el);

          }, 460);

        },
        addOption: function(opt) {
            var view = new OptionView({model: opt});
            this.$("#resultList").append(view.render().el);
        },
        addCal: function(food) {
          var calories = food.get("calories")
            if (calories) {
              this.totalCal += parseInt(food.get("calories"));
              this.updateData();
            }
        },
        subCal: function(food) {
            var calories = food.get("calories")
            if (calories) {
              this.totalCal -= parseInt(food.get("calories"));
              this.updateData();
            }
        },
        updateData: function() {
            $("#dailyTotal").html(this.totalCal);
            // Number of foods
            $("#count").html(" (" + Foods.length + ")");

        },
        populateOptions: function(e) {
            e.preventDefault();
            if (!this.input.val()) return;
            userInput = this.input.val();
            $.ajax({
              url: "https://trackapi.nutritionix.com/v2/search/instant?query=" + userInput,
              headers: {
                "x-app-id": "71233c0a",
                "x-app-key": "02a9b500b81b6ab2e3f000058f372305",
              },
              method: "get",
              dataType: 'json',
            }).done(function(results) {
                var foodList = []
                var length = results.branded.length
                for (var n=0; n < length && n < 20; n++) {
                    var food = results.branded[n]
                    Options.add({name: results.branded[n].food_name, img: food.photo.thumb, food: food.food_name, qty: food.serving_qty.toString() + " " + food.serving_unit, calories: food.nf_calories});

                }
                if (length) {
                    $("#resultList").slideDown();
                };
            }).fail(function( jqXHR, textStatus) {

            });
            this.input.val("");
            return false;
        },
    });

    var App = new AppView;

});
